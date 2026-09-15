"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, type QuickFood } from "@/db/schema";
import { isIsoDate } from "@/lib/date";
import { isMealSlot, type MealSlot } from "@/lib/meal-slots";
import { stimaDaTesto, type EsitoStima } from "@/lib/ai-pasti";
import { getQuickFoods } from "@/lib/queries";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type MealInput = {
  day: string;
  slot: MealSlot;
  name: string;
  quantity: number;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

function validate(input: MealInput): string | null {
  if (!isIsoDate(input.day)) return "Data non valida.";
  if (!isMealSlot(input.slot)) return "Momento della giornata non valido.";
  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || input.quantity > 20) {
    return "La quantità deve stare fra 0 e 20 porzioni.";
  }
  if (!input.name.trim()) return "Il nome del pasto è obbligatorio.";
  if (input.name.trim().length > 120) return "Il nome del pasto è troppo lungo.";

  const numbers: [string, number][] = [
    ["kcal", input.kcal],
    ["carboidrati", input.carbs],
    ["proteine", input.protein],
    ["grassi", input.fat],
  ];
  for (const [label, value] of numbers) {
    if (!Number.isFinite(value) || value < 0) {
      return `Valore non valido per ${label}.`;
    }
  }
  return null;
}

export async function addMeal(input: MealInput): Promise<ActionResult> {
  const error = validate(input);
  if (error) return { ok: false, error };

  try {
    await db.insert(meals).values({
      day: input.day,
      slot: input.slot,
      name: input.name.trim(),
      quantity: input.quantity,
      kcal: Math.round(input.kcal),
      carbs: input.carbs,
      protein: input.protein,
      fat: input.fat,
    });
  } catch (cause) {
    console.error("addMeal fallita", cause);
    return { ok: false, error: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Reinserisce un pasto appena eliminato mantenendone l'orario originale,
 * cosi' dopo un "Annulla" torna al suo posto nella lista e non in fondo.
 */
export async function restoreMeal(
  input: MealInput & { createdAt: string },
): Promise<ActionResult> {
  const error = validate(input);
  if (error) return { ok: false, error };

  const createdAt = new Date(input.createdAt);
  if (Number.isNaN(createdAt.getTime())) return { ok: false, error: "Orario non valido." };

  try {
    await db.insert(meals).values({
      day: input.day,
      slot: input.slot,
      name: input.name.trim(),
      quantity: input.quantity,
      kcal: Math.round(input.kcal),
      carbs: input.carbs,
      protein: input.protein,
      fat: input.fat,
      createdAt,
    });
  } catch (cause) {
    console.error("restoreMeal fallita", cause);
    return { ok: false, error: "Ripristino non riuscito." };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Corregge un pasto gia' inserito: quantita' e momento della giornata.
 *
 * La quantita' riscala i macro dalla porzione base. Il momento serve perche'
 * i tasti rapidi lo scelgono dall'ora dell'orologio: aggiungere uno spuntino
 * alle 12:30 lo fa finire a pranzo, e senza questa correzione ci resta.
 *
 * Sbagliare capita: se correggere costa quanto rifare tutto, il dato
 * sbagliato resta li'.
 */
export async function updateMeal(
  id: number,
  day: string,
  quantity: number,
  slot?: MealSlot,
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Pasto non valido." };
  if (!isIsoDate(day)) return { ok: false, error: "Data non valida." };
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 20) {
    return { ok: false, error: "La quantità deve stare fra 0 e 20 porzioni." };
  }
  if (slot !== undefined && !isMealSlot(slot)) {
    return { ok: false, error: "Momento della giornata non valido." };
  }

  try {
    const [current] = await db
      .select()
      .from(meals)
      .where(and(eq(meals.id, id), eq(meals.day, day)));

    if (!current) return { ok: false, error: "Pasto non trovato." };

    // I macro salvati sono gia' moltiplicati: si torna alla porzione base
    // prima di riscalare, altrimenti l'errore si accumula a ogni modifica.
    const factor = quantity / current.quantity;

    await db
      .update(meals)
      .set({
        quantity,
        kcal: Math.round(current.kcal * factor),
        carbs: current.carbs * factor,
        protein: current.protein * factor,
        fat: current.fat * factor,
        ...(slot === undefined ? {} : { slot }),
      })
      .where(eq(meals.id, id));
  } catch (cause) {
    console.error("updateMeal fallita", cause);
    return { ok: false, error: "Modifica non riuscita. Riprova." };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function deleteMeal(id: number, day: string): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Pasto non valido." };
  if (!isIsoDate(day)) return { ok: false, error: "Data non valida." };

  try {
    await db.delete(meals).where(and(eq(meals.id, id), eq(meals.day, day)));
  } catch (cause) {
    console.error("deleteMeal fallita", cause);
    return { ok: false, error: "Eliminazione non riuscita. Riprova." };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Legge una frase ("due uova, 80 g di pane e un caffè") e propone gli
 * alimenti che contiene, senza salvare niente.
 *
 * I tasti rapidi coprono quello che si mangia sempre; questa copre i giorni
 * in cui si mangia altro. Restituisce una proposta, non una scrittura: il
 * salvataggio resta un gesto separato, fatto guardando i numeri.
 */
export async function stimaPasto(
  testo: string,
  slot: MealSlot,
): Promise<EsitoStima> {
  if (!isMealSlot(slot)) return { ok: false, error: "Momento della giornata non valido." };

  // I cibi rapidi servono da riferimento: se in archivio c'e' gia' un
  // alimento con i valori della confezione, quelli sono veri e vanno riusati
  // invece di stimarli da capo. Se la lettura fallisce si stima lo stesso:
  // un riferimento in meno non giustifica un errore in faccia.
  let riferimenti: QuickFood[] = [];
  try {
    riferimenti = await getQuickFoods();
  } catch (cause) {
    console.error("stimaPasto: cibi rapidi non letti", cause);
  }

  return stimaDaTesto(testo, slot, riferimenti);
}
