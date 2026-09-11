"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meals } from "@/db/schema";
import { isIsoDate } from "@/lib/date";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type MealInput = {
  day: string;
  name: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

function validate(input: MealInput): string | null {
  if (!isIsoDate(input.day)) return "Data non valida.";
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
      name: input.name.trim(),
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
