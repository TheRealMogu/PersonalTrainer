"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { targets } from "@/db/schema";
import { validaObiettivi, type Obiettivi } from "@/lib/targets";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Scrive gli obiettivi. Una riga sola, `id` sempre 1.
 *
 * Non tocca niente di quello che hai gia' registrato, ed e' voluto: un target
 * cambiato a settembre non deve cambiare se a marzo eri in target. Le
 * statistiche di marzo vanno lette col target di marzo -- che oggi non
 * sappiamo piu', ed e' un limite scritto in ROADMAP.md, non una svista.
 */
export async function salvaObiettivi(obiettivi: Obiettivi): Promise<ActionResult> {
  const errore = validaObiettivi(obiettivi);
  if (errore) return { ok: false, error: errore };

  try {
    await db
      .insert(targets)
      .values({
        id: 1,
        kcal: Math.round(obiettivi.macro.kcal),
        carbs: obiettivi.macro.carbs,
        protein: obiettivi.macro.protein,
        fat: obiettivi.macro.fat,
        waterGlasses: obiettivi.bicchieriAcqua,
        stepsTarget: obiettivi.passiGiornalieri,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: targets.id,
        set: {
          kcal: Math.round(obiettivi.macro.kcal),
          carbs: obiettivi.macro.carbs,
          protein: obiettivi.macro.protein,
          fat: obiettivi.macro.fat,
          waterGlasses: obiettivi.bicchieriAcqua,
          stepsTarget: obiettivi.passiGiornalieri,
          updatedAt: new Date(),
        },
      });
  } catch (cause) {
    console.error("salvaObiettivi fallita", cause);
    return { ok: false, error: "Non sono riuscito a salvarli. Riprova." };
  }

  // Tutte le schermate leggono i target: il diario per l'anello, lo storico
  // per le medie, il piano per l'elenco.
  revalidatePath("/");
  revalidatePath("/storico");
  revalidatePath("/piano");
  revalidatePath("/obiettivi");
  return { ok: true };
}
