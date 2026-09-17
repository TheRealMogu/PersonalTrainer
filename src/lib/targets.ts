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

/**
 * L'acqua non e' un macro e non entra in `DAILY_TARGETS`.
 *
 * I macro hanno un colore validato, una barra, un conteggio che finisce nelle
 * medie e nei grafici. L'acqua e' un contatore e basta: mescolarla ai macro
 * la farebbe entrare in medie e statistiche dove non c'entra, e costringerebbe
 * a darle un colore fra quelli gia' assegnati.
 *
 * Il bicchiere e' l'unita' vera: nessuno beve "250 millilitri", beve un
 * bicchiere. I millilitri servono solo a scrivere il totale in litri.
 */
export const OBIETTIVO_ACQUA = {
  bicchieri: 8,
  mlPerBicchiere: 250,
} as const;
