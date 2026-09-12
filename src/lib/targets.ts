/** Target giornalieri assegnati dal personal trainer. */
export const DAILY_TARGETS = {
  kcal: 1905,
  carbs: 220,
  protein: 155,
  fat: 45,
} as const;

export type MacroKey = keyof typeof DAILY_TARGETS;

export const MACRO_LABELS: Record<MacroKey, string> = {
  kcal: "Calorie",
  carbs: "Carboidrati",
  protein: "Proteine",
  fat: "Grassi",
};

export const MACRO_UNITS: Record<MacroKey, string> = {
  kcal: "kcal",
  carbs: "g",
  protein: "g",
  fat: "g",
};

export const MACRO_ORDER: MacroKey[] = ["kcal", "carbs", "protein", "fat"];
