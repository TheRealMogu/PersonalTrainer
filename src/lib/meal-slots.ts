import type { Meal } from "@/db/schema";

export const MEAL_SLOTS = ["colazione", "pranzo", "cena", "spuntino"] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

export const SLOT_LABELS: Record<MealSlot, string> = {
  colazione: "Colazione",
  pranzo: "Pranzo",
  cena: "Cena",
  spuntino: "Spuntini",
};

export function isMealSlot(value: unknown): value is MealSlot {
  return typeof value === "string" && (MEAL_SLOTS as readonly string[]).includes(value);
}

/**
 * Il momento da proporre in base all'ora: chi apre l'app alle otto di mattina
 * sta registrando la colazione, non uno spuntino. Si puo' sempre cambiare.
 */
export function slotForHour(hour: number): MealSlot {
  if (hour < 11) return "colazione";
  if (hour < 15) return "pranzo";
  if (hour < 18) return "spuntino";
  if (hour < 23) return "cena";
  return "spuntino";
}

export type MealsBySlot = Record<MealSlot, Meal[]>;

/** Divide i pasti nei quattro momenti, mantenendo l'ordine di inserimento. */
export function groupBySlot(meals: Meal[]): MealsBySlot {
  const grouped: MealsBySlot = { colazione: [], pranzo: [], cena: [], spuntino: [] };
  for (const meal of meals) grouped[meal.slot as MealSlot].push(meal);
  return grouped;
}
