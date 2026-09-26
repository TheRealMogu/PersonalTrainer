"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { inTransazione } from "@/db/transazione";
import {
  workoutDays,
  workoutExercises,
  workoutExerciseWeeks,
  workoutProgramma,
} from "@/db/schema";
import {
  confrontaSettimane,
  leggiSettimane,
  type ConfrontoSettimane,
  type GiornataAttuale,
} from "@/lib/settimane";

/** Le giornate di adesso, coi loro esercizi: serve per il prompt e per l'abbinamento. */
export async function leggiEserciziAttuali(): Promise<GiornataAttuale[]> {
  const [giornate, esercizi] = await Promise.all([
    db
      .select()
      .from(workoutDays)
      .where(isNull(workoutDays.archiviatoIl))
      .orderBy(asc(workoutDays.sortOrder), asc(workoutDays.id)),
    db
      .select()
      .from(workoutExercises)
      .where(isNull(workoutExercises.archiviatoIl))
      .orderBy(asc(workoutExercises.sortOrder), asc(workoutExercises.id)),
  ]);

  return giornate.map((giornata) => ({
    etichetta: giornata.label,
    esercizi: esercizi
      .filter((e) => e.dayId === giornata.id)
      .map((e) => ({ id: e.id, name: e.name })),
  }));
}

export type SettimaneResult =
  | { ok: true; confronto: ConfrontoSettimane }
  | { ok: false; error: string };

/** Legge il testo incollato e dice cosa si abbinerebbe. Non scrive niente. */
export async function anteprimaSettimane(
  testo: string,
): Promise<SettimaneResult> {
  const letto = leggiSettimane(testo);
  if (!letto.ok) return { ok: false, error: letto.errore };

  try {
    const attuali = await leggiEserciziAttuali();
    return { ok: true, confronto: confrontaSettimane(attuali, letto.giornate) };
  } catch (cause) {
    console.error("anteprimaSettimane fallita", cause);
    return {
      ok: false,
      error: "Non sono riuscito a leggere gli esercizi di adesso. Riprova.",
    };
  }
}

/**
 * Applica: per ogni esercizio trovato, sostituisce le sue settimane con
 * quelle nuove -- non le accumula, il blocco vecchio non serve più una
 * volta arrivato quello nuovo (non è storico da conservare, è la
 * prescrizione di adesso). Riporta a 1 la settimana in corso: un blocco
 * nuovo si legge sempre dall'inizio.
 *
 * Tutto insieme o niente, come `applicaScheda`: un'interruzione a metà
 * lascerebbe alcuni esercizi con la prescrizione vecchia e altri con la
 * nuova.
 */
export async function applicaSettimane(
  testo: string,
): Promise<SettimaneResult> {
  const letto = leggiSettimane(testo);
  if (!letto.ok) return { ok: false, error: letto.errore };

  try {
    const attuali = await leggiEserciziAttuali();
    const confronto = confrontaSettimane(attuali, letto.giornate);

    if (confronto.trovati.length === 0) {
      return {
        ok: false,
        error:
          "Nessun nome corrisponde a un esercizio di adesso: controlla che siano scritti identici.",
      };
    }

    await inTransazione((esecutore) => [
      ...confronto.trovati.flatMap((esercizio) => [
        esecutore
          .delete(workoutExerciseWeeks)
          .where(eq(workoutExerciseWeeks.exerciseId, esercizio.id)),
        ...(esercizio.settimane.length > 0
          ? [
              esecutore.insert(workoutExerciseWeeks).values(
                esercizio.settimane.map((s) => ({
                  exerciseId: esercizio.id,
                  settimana: s.settimana,
                  reps: s.ripetizioni,
                  peso: s.peso,
                })),
              ),
            ]
          : []),
      ]),
      esecutore
        .insert(workoutProgramma)
        .values({ id: 1, settimanaCorrente: 1 })
        .onConflictDoUpdate({
          target: workoutProgramma.id,
          set: { settimanaCorrente: 1 },
        }),
    ]);

    revalidatePath("/allenamento");
    revalidatePath("/scheda/settimane");
    return { ok: true, confronto };
  } catch (cause) {
    console.error("applicaSettimane fallita", cause);
    return {
      ok: false,
      error: "Non sono riuscito a salvare. Riprova.",
    };
  }
}

/**
 * Cambia manualmente la settimana in corso. A mano e non a calendario: un
 * blocco si segue a sedute fatte, non a giorni passati -- vedi
 * `workout_programma` in `schema.ts`.
 */
export async function impostaSettimana(
  settimana: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(settimana) || settimana < 1) {
    return { ok: false, error: "Settimana non valida." };
  }
  try {
    await db
      .insert(workoutProgramma)
      .values({ id: 1, settimanaCorrente: settimana })
      .onConflictDoUpdate({
        target: workoutProgramma.id,
        set: { settimanaCorrente: settimana },
      });
    revalidatePath("/allenamento");
    return { ok: true };
  } catch (cause) {
    console.error("impostaSettimana fallita", cause);
    return { ok: false, error: "Non sono riuscito a salvare. Riprova." };
  }
}
