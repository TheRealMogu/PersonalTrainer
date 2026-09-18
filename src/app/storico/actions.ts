"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { weekNotes } from "@/db/schema";
import { isIsoDate } from "@/lib/date";
import { MAX_NOTA_DIETA } from "@/lib/riepilogo";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Scrive (o cancella) la nota sulla dieta della settimana.
 *
 * Una stringa vuota cancella la riga: "nota cancellata" e "nota mai
 * scritta" sono la stessa cosa, come per la nota di una seduta.
 */
export async function salvaNotaDieta(
  weekStart: string,
  note: string,
): Promise<ActionResult> {
  if (!isIsoDate(weekStart)) {
    return { ok: false, error: "Settimana non valida." };
  }
  const pulita = note.trim();
  if (pulita.length > MAX_NOTA_DIETA) {
    return {
      ok: false,
      error: `La nota non può superare ${MAX_NOTA_DIETA} caratteri.`,
    };
  }

  try {
    if (pulita === "") {
      await db.delete(weekNotes).where(eq(weekNotes.weekStart, weekStart));
    } else {
      await db
        .insert(weekNotes)
        .values({ weekStart, note: pulita })
        .onConflictDoUpdate({
          target: weekNotes.weekStart,
          set: { note: pulita, updatedAt: new Date() },
        });
    }
  } catch (cause) {
    console.error("salvaNotaDieta fallita", cause);
    return {
      ok: false,
      error: "Non sono riuscito a salvare la nota. Riprova.",
    };
  }

  revalidatePath("/storico");
  return { ok: true };
}
