"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, waterDays } from "@/db/schema";
import { MAX_BICCHIERI } from "@/lib/acqua";
import { isIsoDate } from "@/lib/date";
import { isMealSlot, type MealSlot } from "@/lib/meal-slots";

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
 * Cosa si puo' correggere di un pasto gia' inserito: tutto.
 *
 * Prima si potevano cambiare solo quantita' e momento, e i macro venivano
 * riscalati dal server. Bastava finche' i numeri arrivavano dai tasti
 * rapidi, dove sono letti sulla confezione. Da quando arrivano anche da una
 * stima incollata da una chat non basta piu': se la stima e' sbagliata di
 * trenta calorie, riscalare la quantita' non la aggiusta -- sposta
 * l'errore.
 *
 * I valori arrivano assoluti, gia' come vanno scritti. Il riscalamento per
 * quantita' lo fa il foglio, dove si vede mentre lo fai: qui si scrive
 * quello che hai davanti agli occhi, e non c'e' un secondo calcolo che
 * potrebbe non essere d'accordo col primo.
 */
export type MealPatch = {
  name: string;
  quantity: number;
  slot: MealSlot;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

export async function updateMeal(
  id: number,
  day: string,
  patch: MealPatch,
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Pasto non valido." };

  const error = validate({ day, ...patch });
  if (error) return { ok: false, error };

  try {
    const aggiornate = await db
      .update(meals)
      .set({
        name: patch.name.trim(),
        quantity: patch.quantity,
        slot: patch.slot,
        kcal: Math.round(patch.kcal),
        carbs: patch.carbs,
        protein: patch.protein,
        fat: patch.fat,
      })
      .where(and(eq(meals.id, id), eq(meals.day, day)))
      .returning({ id: meals.id });

    if (aggiornate.length === 0) return { ok: false, error: "Pasto non trovato." };
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
 * Quanti bicchieri d'acqua hai bevuto oggi.
 *
 * Si manda il totale, non "uno in piu'". Sembra un dettaglio e non lo e': su
 * rete lenta si tocca due volte, e un "aggiungi uno" ripetuto conterebbe due
 * bicchieri per un tocco solo. Col totale il secondo invio scrive lo stesso
 * numero del primo, e non succede niente -- la stessa ragione per cui le
 * serie in palestra portano un identificativo.
 *
 * Non serve un annullamento: il "meno" e' gia' l'inverso esatto del "piu'",
 * a un tocco di distanza. La regola 4 chiede che un errore si possa
 * disfare, non che ci sia per forza un messaggio che lo propone.
 */
export async function setWater(day: string, bicchieri: number): Promise<ActionResult> {
  if (!isIsoDate(day)) return { ok: false, error: "Data non valida." };
  if (!Number.isInteger(bicchieri) || bicchieri < 0 || bicchieri > MAX_BICCHIERI) {
    return { ok: false, error: `I bicchieri devono stare fra 0 e ${MAX_BICCHIERI}.` };
  }

  try {
    await db
      .insert(waterDays)
      .values({ day, glasses: bicchieri, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: waterDays.day,
        set: { glasses: bicchieri, updatedAt: new Date() },
      });
  } catch (cause) {
    console.error("setWater fallita", cause);
    return { ok: false, error: "Non sono riuscito a segnarlo. Riprova." };
  }

  revalidatePath("/");
  return { ok: true };
}
