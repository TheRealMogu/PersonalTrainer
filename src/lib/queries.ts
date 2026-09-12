import "server-only";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import type { DailyTotals } from "@/lib/history";
import {
  meals,
  quickFoods,
  workoutDays,
  workoutExercises,
  type Meal,
  type QuickFood,
  type WorkoutExercise,
} from "@/db/schema";

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
