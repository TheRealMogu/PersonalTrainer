"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { workoutSessions, workoutSets } from "@/db/schema";
import { todayIso } from "@/lib/date";

export type SessionResult = { ok: true; sessionId: number } | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Limiti larghi ma non assurdi: servono a fermare le dita, non ad allenare. */
const MAX_WEIGHT_KG = 600;
const MAX_REPS = 200;

/**
 * Apre una seduta, o restituisce quella gia' aperta: due tocchi ravvicinati
 * sul tasto non devono creare due allenamenti paralleli.
 */
export async function startSession(dayId: number): Promise<SessionResult> {
  if (!Number.isInteger(dayId) || dayId <= 0) {
    return { ok: false, error: "Giornata non valida." };
  }

  try {
    const [open] = await db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(isNull(workoutSessions.endedAt));

    if (open) return { ok: true, sessionId: open.id };

    const [created] = await db
      .insert(workoutSessions)
      .values({ dayId, day: todayIso() })
      .returning({ id: workoutSessions.id });

    revalidatePath("/allenamento");
    return { ok: true, sessionId: created.id };
  } catch (cause) {
    console.error("startSession fallita", cause);
    return { ok: false, error: "Non sono riuscito ad aprire l'allenamento." };
  }
}

/** Lunghezza massima dell'identificativo: un UUID ne occupa 36. */
const MAX_CLIENT_ID = 64;

/**
 * Registra una serie.
 *
 * `clientId` lo genera il telefono prima di inviare, e serve a una cosa sola:
 * rendere sicuro riprovare. In palestra la rete cade a meta' invio, e senza
 * un identificativo il secondo tentativo non ha modo di sapere se il primo
 * era arrivato: o si perde la serie, o se ne scrivono due. Con
 * l'identificativo, il secondo tentativo trova la riga gia' li' e non fa
 * niente.
 */
export async function logSet(input: {
  sessionId: number;
  exerciseId: number;
  weight: number;
  reps: number;
  clientId?: string;
}): Promise<ActionResult> {
  const { sessionId, exerciseId, weight, reps, clientId } = input;

  if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT_KG) {
    return { ok: false, error: `Il carico deve stare fra 0 e ${MAX_WEIGHT_KG} kg.` };
  }
  if (!Number.isInteger(reps) || reps < 1 || reps > MAX_REPS) {
    return { ok: false, error: `Le ripetizioni devono stare fra 1 e ${MAX_REPS}.` };
  }
  if (clientId !== undefined && (typeof clientId !== "string" || clientId.length > MAX_CLIENT_ID)) {
    return { ok: false, error: "Identificativo della serie non valido." };
  }

  try {
    // Il numero della serie si calcola qui: il client non deve poterlo sbagliare.
    const existing = await db
      .select({ setNumber: workoutSets.setNumber })
      .from(workoutSets)
      .where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.exerciseId, exerciseId)));

    const next = existing.reduce((max, row) => Math.max(max, row.setNumber), 0) + 1;

    await db
      .insert(workoutSets)
      .values({
        sessionId,
        exerciseId,
        setNumber: next,
        weight,
        reps,
        clientId: clientId ?? null,
      })
      // Serie gia' arrivata: il riprova non ne scrive una seconda.
      .onConflictDoNothing({ target: workoutSets.clientId });
  } catch (cause) {
    console.error("logSet fallita", cause);
    return { ok: false, error: "Serie non salvata. Riprova." };
  }

  revalidatePath("/allenamento");
  return { ok: true };
}

export async function deleteSet(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Serie non valida." };

  try {
    await db.delete(workoutSets).where(eq(workoutSets.id, id));
  } catch (cause) {
    console.error("deleteSet fallita", cause);
    return { ok: false, error: "Eliminazione non riuscita." };
  }

  revalidatePath("/allenamento");
  return { ok: true };
}

export async function endSession(sessionId: number): Promise<ActionResult> {
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return { ok: false, error: "Allenamento non valido." };
  }

  try {
    await db
      .update(workoutSessions)
      .set({ endedAt: new Date() })
      .where(eq(workoutSessions.id, sessionId));
  } catch (cause) {
    console.error("endSession fallita", cause);
    return { ok: false, error: "Non sono riuscito a chiudere l'allenamento." };
  }

  revalidatePath("/allenamento");
  return { ok: true };
}

/**
 * Correzione di una serie gia' registrata.
 *
 * In palestra si sbaglia a digitare: 50 invece di 60, 8 invece di 10. Senza
 * questa, l'unica strada era eliminare e riscrivere -- e l'eliminazione non
 * si poteva annullare, quindi un tocco storto costava la serie.
 */
export async function updateSet(input: {
  id: number;
  weight: number;
  reps: number;
}): Promise<ActionResult> {
  const { id, weight, reps } = input;

  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Serie non valida." };
  if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT_KG) {
    return { ok: false, error: `Il carico deve stare fra 0 e ${MAX_WEIGHT_KG} kg.` };
  }
  if (!Number.isInteger(reps) || reps < 1 || reps > MAX_REPS) {
    return { ok: false, error: `Le ripetizioni devono stare fra 1 e ${MAX_REPS}.` };
  }

  try {
    await db.update(workoutSets).set({ weight, reps }).where(eq(workoutSets.id, id));
  } catch (cause) {
    console.error("updateSet fallita", cause);
    return { ok: false, error: "Modifica non riuscita." };
  }

  revalidatePath("/allenamento");
  return { ok: true };
}

/**
 * Rimette una serie eliminata al suo posto, con lo stesso numero d'ordine.
 *
 * Non passa da `logSet` di proposito: quella ricalcola il numero della serie
 * e la rimetterebbe in fondo, cambiando l'ordine di un allenamento gia'
 * fatto. L'annullamento deve riportare le cose com'erano, non somigliarci.
 */
export async function restoreSet(input: {
  sessionId: number;
  exerciseId: number;
  setNumber: number;
  weight: number;
  reps: number;
}): Promise<ActionResult> {
  const { sessionId, exerciseId, setNumber, weight, reps } = input;

  if (!Number.isInteger(sessionId) || sessionId <= 0) return { ok: false, error: "Allenamento non valido." };
  if (!Number.isInteger(exerciseId) || exerciseId <= 0) return { ok: false, error: "Esercizio non valido." };
  if (!Number.isInteger(setNumber) || setNumber <= 0) return { ok: false, error: "Serie non valida." };
  if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT_KG) {
    return { ok: false, error: `Il carico deve stare fra 0 e ${MAX_WEIGHT_KG} kg.` };
  }
  if (!Number.isInteger(reps) || reps < 1 || reps > MAX_REPS) {
    return { ok: false, error: `Le ripetizioni devono stare fra 1 e ${MAX_REPS}.` };
  }

  try {
    await db.insert(workoutSets).values({ sessionId, exerciseId, setNumber, weight, reps });
  } catch (cause) {
    console.error("restoreSet fallita", cause);
    return { ok: false, error: "Non sono riuscito a rimettere la serie." };
  }

  revalidatePath("/allenamento");
  return { ok: true };
}

/**
 * Riapre una seduta chiusa per sbaglio.
 *
 * "Fine" sta in alto a destra, dove il pollice passa. Senza questa, un tocco
 * storto spezzava l'allenamento in due sedute e non c'era modo di rimediare.
 * Riapre solo se non ce n'e' gia' un'altra aperta.
 */
export async function reopenSession(sessionId: number): Promise<ActionResult> {
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return { ok: false, error: "Allenamento non valido." };
  }

  try {
    const [aperta] = await db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(isNull(workoutSessions.endedAt));

    if (aperta && aperta.id !== sessionId) {
      return { ok: false, error: "C'è già un allenamento aperto." };
    }

    await db
      .update(workoutSessions)
      .set({ endedAt: null })
      .where(eq(workoutSessions.id, sessionId));
  } catch (cause) {
    console.error("reopenSession fallita", cause);
    return { ok: false, error: "Non sono riuscito a riaprire l'allenamento." };
  }

  revalidatePath("/allenamento");
  return { ok: true };
}

/** Tutto quello che serve per rimettere in piedi una seduta eliminata. */
export type SessionBackup = {
  dayId: number;
  day: string;
  startedAt: string;
  endedAt: string | null;
  sets: { exerciseId: number; setNumber: number; weight: number; reps: number }[];
};

export type DeleteSessionResult =
  | { ok: true; backup: SessionBackup }
  | { ok: false; error: string };

/**
 * Elimina una seduta e le sue serie, restituendo di cosa era fatta.
 *
 * Serve per la giornata avviata per sbaglio: chiuderla lasciava una riga
 * nello storico che non si poteva togliere. Le serie vanno via con lei per il
 * vincolo di cascata.
 *
 * Il contenuto torna indietro perche' l'eliminazione resti annullabile: e' la
 * sola azione qui dentro che potrebbe portarsi via un allenamento intero, e
 * proprio per quello non puo' essere l'unica senza ritorno.
 */
export async function deleteSession(sessionId: number): Promise<DeleteSessionResult> {
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return { ok: false, error: "Allenamento non valido." };
  }

  try {
    const [seduta] = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, sessionId));

    if (!seduta) return { ok: false, error: "Allenamento non trovato." };

    const serie = await db
      .select({
        exerciseId: workoutSets.exerciseId,
        setNumber: workoutSets.setNumber,
        weight: workoutSets.weight,
        reps: workoutSets.reps,
      })
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, sessionId));

    await db.delete(workoutSessions).where(eq(workoutSessions.id, sessionId));

    revalidatePath("/allenamento");
    revalidatePath("/storico");
    return {
      ok: true,
      backup: {
        dayId: seduta.dayId,
        day: seduta.day,
        startedAt: seduta.startedAt.toISOString(),
        endedAt: seduta.endedAt ? seduta.endedAt.toISOString() : null,
        sets: serie,
      },
    };
  } catch (cause) {
    console.error("deleteSession fallita", cause);
    return { ok: false, error: "Eliminazione non riuscita." };
  }
}

/**
 * Rimette una seduta eliminata, con le sue serie e i suoi orari.
 *
 * Gli identificativi sono nuovi -- le righe vecchie non esistono piu' -- ma
 * quello che conta e' identico: giornata, orari, carichi, ordine delle serie.
 */
export async function restoreSession(backup: SessionBackup): Promise<ActionResult> {
  if (!Number.isInteger(backup?.dayId) || backup.dayId <= 0) {
    return { ok: false, error: "Allenamento non valido." };
  }
  if (backup.sets.length > 500) {
    return { ok: false, error: "Troppe serie da ripristinare." };
  }

  try {
    const [creata] = await db
      .insert(workoutSessions)
      .values({
        dayId: backup.dayId,
        day: backup.day,
        startedAt: new Date(backup.startedAt),
        endedAt: backup.endedAt ? new Date(backup.endedAt) : null,
      })
      .returning({ id: workoutSessions.id });

    if (backup.sets.length > 0) {
      await db.insert(workoutSets).values(
        backup.sets.map((serie) => ({ ...serie, sessionId: creata.id })),
      );
    }
  } catch (cause) {
    console.error("restoreSession fallita", cause);
    return { ok: false, error: "Non sono riuscito a rimettere l'allenamento." };
  }

  revalidatePath("/allenamento");
  revalidatePath("/storico");
  return { ok: true };
}
