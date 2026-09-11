import { DAILY_TARGETS, MACRO_ORDER, type MacroKey } from "./targets";

export type MacroTotals = Record<MacroKey, number>;

export type MacroSource = {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

export const EMPTY_TOTALS: MacroTotals = {
  kcal: 0,
  carbs: 0,
  protein: 0,
  fat: 0,
};

/** Somma i macro di una lista di pasti. */
export function sumMacros(items: MacroSource[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (acc, item) => {
      for (const key of MACRO_ORDER) {
        acc[key] += item[key];
      }
      return acc;
    },
    { ...EMPTY_TOTALS },
  );
}

/** Arrotonda per la UI: i grammi a una cifra decimale, le kcal a intero. */
export function formatMacro(value: number, key: MacroKey): string {
  if (key === "kcal") return Math.round(value).toString();
  return (Math.round(value * 10) / 10).toString();
}

export type MacroProgress = {
  key: MacroKey;
  consumed: number;
  target: number;
  /** Quanto manca al target; 0 se raggiunto o superato. */
  remaining: number;
  /** Quanto si è oltre il target; 0 se si è ancora sotto. */
  over: number;
  /** Percentuale 0-100 usata per riempire la barra. */
  percent: number;
  isOver: boolean;
};

export function buildProgress(totals: MacroTotals): MacroProgress[] {
  return MACRO_ORDER.map((key) => {
    const consumed = totals[key];
    const target = DAILY_TARGETS[key];
    const diff = target - consumed;
    return {
      key,
      consumed,
      target,
      remaining: diff > 0 ? diff : 0,
      over: diff < 0 ? -diff : 0,
      percent: Math.min(100, target > 0 ? (consumed / target) * 100 : 0),
      isOver: consumed > target,
    };
  });
}
