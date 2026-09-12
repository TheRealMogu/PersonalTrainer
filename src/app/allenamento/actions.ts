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

export async function logSet(input: {
  sessionId: number;
  exerciseId: number;
  weight: number;
  reps: number;
}): Promise<ActionResult> {
  const { sessionId, exerciseId, weight, reps } = input;

  if (!Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT_KG) {
    return { ok: false, error: `Il carico deve stare fra 0 e ${MAX_WEIGHT_KG} kg.` };
  }
  if (!Number.isInteger(reps) || reps < 1 || reps > MAX_REPS) {
    return { ok: false, error: `Le ripetizioni devono stare fra 1 e ${MAX_REPS}.` };
  }

  try {
    // Il numero della serie si calcola qui: il client non deve poterlo sbagliare.
    const existing = await db
      .select({ setNumber: workoutSets.setNumber })
      .from(workoutSets)
      .where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.exerciseId, exerciseId)));

    const next = existing.reduce((max, row) => Math.max(max, row.setNumber), 0) + 1;

    await db.insert(workoutSets).values({
      sessionId,
      exerciseId,
      setNumber: next,
      weight,
      reps,
    });
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
