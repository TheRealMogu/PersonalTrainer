import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
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
