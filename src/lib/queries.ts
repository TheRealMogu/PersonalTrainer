import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import type { DailyTotals } from "@/lib/history";
import {
  meals,
  quickFoods,
  workoutDays,
  workoutExercises,
  workoutSessions,
  workoutSets,
  type Meal,
  type QuickFood,
  type WorkoutExercise,
  type WorkoutSession,
} from "@/db/schema";
import type { LoggedSet } from "@/lib/workout";

export async function getMealsByDay(day: string): Promise<Meal[]> {
  return db
    .select()
    .from(meals)
    .where(eq(meals.day, day))
    .orderBy(asc(meals.createdAt), asc(meals.id));
}

/** Totali per giornata in un intervallo di date, solo per i giorni con pasti. */
export async function getDailyTotals(from: string, to: string): Promise<DailyTotals[]> {
  const rows = await db
    .select({
      day: meals.day,
      kcal: sql<number>`sum(${meals.kcal})::int`,
      carbs: sql<number>`sum(${meals.carbs})::float8`,
      protein: sql<number>`sum(${meals.protein})::float8`,
      fat: sql<number>`sum(${meals.fat})::float8`,
    })
    .from(meals)
    .where(and(gte(meals.day, from), lte(meals.day, to)))
    .groupBy(meals.day)
    .orderBy(asc(meals.day));

  // Il driver puo' restituire i numeric come stringa: normalizziamo qui.
  return rows.map((row) => ({
    day: row.day,
    kcal: Number(row.kcal),
    carbs: Number(row.carbs),
    protein: Number(row.protein),
    fat: Number(row.fat),
  }));
}

export async function getQuickFoods(): Promise<QuickFood[]> {
  return db
    .select()
    .from(quickFoods)
    .orderBy(asc(quickFoods.sortOrder), asc(quickFoods.id));
}

export type WorkoutDayWithExercises = {
  id: number;
  label: string;
  focus: string;
  exercises: WorkoutExercise[];
};

export async function getWorkout(): Promise<WorkoutDayWithExercises[]> {
  const [days, exercises] = await Promise.all([
    db.select().from(workoutDays).orderBy(asc(workoutDays.sortOrder), asc(workoutDays.id)),
    db
      .select()
      .from(workoutExercises)
      .orderBy(asc(workoutExercises.sortOrder), asc(workoutExercises.id)),
  ]);

  return days.map((day) => ({
    id: day.id,
    label: day.label,
    focus: day.focus,
    exercises: exercises.filter((exercise) => exercise.dayId === day.id),
  }));
}


/** La seduta ancora aperta, se c'e': riaprendo l'app si riprende da li'. */
export async function getOpenSession(): Promise<WorkoutSession | null> {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(isNull(workoutSessions.endedAt))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);
  return session ?? null;
}

export async function getSession(id: number): Promise<WorkoutSession | null> {
  const [session] = await db.select().from(workoutSessions).where(eq(workoutSessions.id, id));
  return session ?? null;
}

export async function getSessionSets(sessionId: number): Promise<LoggedSet[]> {
  return db
    .select({
      id: workoutSets.id,
      exerciseId: workoutSets.exerciseId,
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .where(eq(workoutSets.sessionId, sessionId))
    .orderBy(asc(workoutSets.setNumber), asc(workoutSets.id));
}

/**
 * Le serie dell'ultima volta che hai fatto questi esercizi, una lista per
 * esercizio. Serve a proporre il carico senza doverlo ricordare.
 */
export async function getPreviousSets(
  exerciseIds: number[],
  excludeSessionId: number,
): Promise<Map<number, LoggedSet[]>> {
  const result = new Map<number, LoggedSet[]>();
  if (exerciseIds.length === 0) return result;

  // Per ogni esercizio interessa solo la seduta piu' recente in cui compare.
  const rows = await db
    .select({
      id: workoutSets.id,
      exerciseId: workoutSets.exerciseId,
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      sessionId: workoutSets.sessionId,
      startedAt: workoutSessions.startedAt,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .where(
      and(
        inArray(workoutSets.exerciseId, exerciseIds),
        ne(workoutSets.sessionId, excludeSessionId),
      ),
    )
    .orderBy(desc(workoutSessions.startedAt), asc(workoutSets.setNumber));

  const seenSession = new Map<number, number>();
  for (const row of rows) {
    const chosen = seenSession.get(row.exerciseId);
    if (chosen === undefined) seenSession.set(row.exerciseId, row.sessionId);
    else if (chosen !== row.sessionId) continue;

    const list = result.get(row.exerciseId);
    const set = {
      id: row.id,
      exerciseId: row.exerciseId,
      setNumber: row.setNumber,
      weight: row.weight,
      reps: row.reps,
    };
    if (list) list.push(set);
    else result.set(row.exerciseId, [set]);
  }
  return result;
}

/** Sedute concluse, dalla piu' recente, col volume gia' sommato. */
export async function getRecentSessions(limit = 20) {
  return db
    .select({
      id: workoutSessions.id,
      day: workoutSessions.day,
      label: workoutDays.label,
      focus: workoutDays.focus,
      startedAt: workoutSessions.startedAt,
      endedAt: workoutSessions.endedAt,
      volume: sql<number>`coalesce(sum(${workoutSets.weight} * ${workoutSets.reps}), 0)::float8`,
      setCount: sql<number>`count(${workoutSets.id})::int`,
    })
    .from(workoutSessions)
    .innerJoin(workoutDays, eq(workoutSessions.dayId, workoutDays.id))
    .leftJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
    .where(isNotNull(workoutSessions.endedAt))
    .groupBy(workoutSessions.id, workoutDays.label, workoutDays.focus)
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit);
}
