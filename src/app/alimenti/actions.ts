"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quickFoods } from "@/db/schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Un alimento dell'archivio personale.
 *
 * "Personale" e' il punto. I valori sono quelli letti sulla tua confezione e
 * la porzione e' quella che usi tu, non "100 g". Un archivio dei prodotti del
 * mondo non puo' sapere che la tua colazione sono 30 g di cereali con 150 ml
 * di latte; il tuo archivio lo sa, e una volta che lo sa e' giusto per
 * sempre. Per questo cresce mangiando, non scaricando.
 */
export type QuickFoodInput = {
  name: string;
  portion: string | null;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

/** Tetti larghi: fermano un numero impazzito, non giudicano un alimento. */
const MAX_KCAL = 5000;
const MAX_GRAMMI = 1000;

function valida(input: QuickFoodInput): string | null {
  if (!input.name.trim()) return "Il nome è obbligatorio.";
  if (input.name.trim().length > 120) return "Il nome è troppo lungo.";
  if (input.portion !== null && input.portion.length > 80) {
    return "La porzione è troppo lunga.";
  }

  const numeri: [string, number, number][] = [
    ["le calorie", input.kcal, MAX_KCAL],
    ["i carboidrati", input.carbs, MAX_GRAMMI],
    ["le proteine", input.protein, MAX_GRAMMI],
    ["i grassi", input.fat, MAX_GRAMMI],
  ];
  for (const [etichetta, valore, massimo] of numeri) {
    if (!Number.isFinite(valore) || valore < 0) return `Valore non valido per ${etichetta}.`;
    if (valore > massimo) return `Valore troppo alto per ${etichetta}.`;
  }
  return null;
}

function pulisci(input: QuickFoodInput) {
  const porzione = input.portion?.trim();
  return {
    name: input.name.trim(),
    portion: porzione ? porzione : null,
    kcal: Math.round(input.kcal),
    carbs: input.carbs,
    protein: input.protein,
    fat: input.fat,
  };
}

/**
 * Aggiunge un alimento in fondo all'archivio.
 *
 * In fondo e non in cima: l'ordine dei tasti rapidi e' una cosa che si
 * decide, non un effetto collaterale dell'ultimo inserimento.
 */
export async function addQuickFood(input: QuickFoodInput): Promise<ActionResult> {
  const errore = valida(input);
  if (errore) return { ok: false, error: errore };

  try {
    const [ultimo] = await db
      .select({ massimo: sql<number>`coalesce(max(${quickFoods.sortOrder}), -1)::int` })
      .from(quickFoods);

    await db.insert(quickFoods).values({
      ...pulisci(input),
      sortOrder: (ultimo?.massimo ?? -1) + 1,
    });
  } catch (cause) {
    console.error("addQuickFood fallita", cause);
    return { ok: false, error: "Non sono riuscito a salvarlo. Riprova." };
  }

  revalidatePath("/");
  revalidatePath("/alimenti");
  return { ok: true };
}

export async function updateQuickFood(
  id: number,
  input: QuickFoodInput,
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Alimento non valido." };
  const errore = valida(input);
  if (errore) return { ok: false, error: errore };

  try {
    const righe = await db
      .update(quickFoods)
      .set(pulisci(input))
      .where(eq(quickFoods.id, id))
      .returning({ id: quickFoods.id });

    if (righe.length === 0) return { ok: false, error: "Alimento non trovato." };
  } catch (cause) {
    console.error("updateQuickFood fallita", cause);
    return { ok: false, error: "Modifica non riuscita. Riprova." };
  }

  revalidatePath("/");
  revalidatePath("/alimenti");
  return { ok: true };
}

export type QuickFoodBackup = QuickFoodInput & { sortOrder: number };

export type DeleteQuickFoodResult =
  | { ok: true; backup: QuickFoodBackup }
  | { ok: false; error: string };

/**
 * Toglie un alimento, restituendo com'era.
 *
 * I pasti gia' registrati non ne risentono: quando aggiungi un cibo rapido al
 * diario i valori vengono copiati nella riga del pasto, non riferiti. Un
 * alimento eliminato oggi non cambia la colazione di marzo -- ed e' giusto
 * cosi', perche' quella colazione l'hai mangiata davvero.
 */
export async function deleteQuickFood(id: number): Promise<DeleteQuickFoodResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Alimento non valido." };

  try {
    const [riga] = await db.delete(quickFoods).where(eq(quickFoods.id, id)).returning();
    if (!riga) return { ok: false, error: "Alimento non trovato." };

    revalidatePath("/");
    revalidatePath("/alimenti");
    return {
      ok: true,
      backup: {
        name: riga.name,
        portion: riga.portion,
        kcal: riga.kcal,
        carbs: riga.carbs,
        protein: riga.protein,
        fat: riga.fat,
        sortOrder: riga.sortOrder,
      },
    };
  } catch (cause) {
    console.error("deleteQuickFood fallita", cause);
    return { ok: false, error: "Eliminazione non riuscita. Riprova." };
  }
}

/** Rimette un alimento eliminato al suo posto nell'ordine, non in fondo. */
export async function restoreQuickFood(backup: QuickFoodBackup): Promise<ActionResult> {
  const errore = valida(backup);
  if (errore) return { ok: false, error: errore };

  try {
    await db.insert(quickFoods).values({ ...pulisci(backup), sortOrder: backup.sortOrder });
  } catch (cause) {
    console.error("restoreQuickFood fallita", cause);
    return { ok: false, error: "Ripristino non riuscito." };
  }

  revalidatePath("/");
  revalidatePath("/alimenti");
  return { ok: true };
}
