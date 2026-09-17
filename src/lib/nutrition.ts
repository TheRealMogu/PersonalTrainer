import { DAILY_TARGETS, MACRO_ORDER, type MacroKey } from "./targets";

/** I target rispetto a cui si misura. Predefiniti: quelli del codice. */
type Target = Record<MacroKey, number>;

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

export function buildProgress(
  totals: MacroTotals,
  targets: Target = DAILY_TARGETS,
): MacroProgress[] {
  return MACRO_ORDER.map((key) => {
    const consumed = totals[key];
    const target = targets[key];
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

export type FitVerdict = {
  /** Vero se non fa passare oltre il target nessun macro che ancora ci sta. */
  fits: boolean;
  /** I macro che questo alimento farebbe sforare, per dirlo invece di colorare. */
  exceeds: MacroKey[];
};

/**
 * Se un alimento "ci sta ancora" in quello che resta della giornata.
 *
 * I macro gia' oltre target non vengono contati: se hai gia' sforato i
 * carboidrati, qualunque cosa li peggiora, e segnalarlo su ogni alimento
 * farebbe sembrare tutto proibito senza aiutare a scegliere. Conta solo dove
 * hai ancora margine.
 *
 * Non e' un consiglio nutrizionale: e' la sottrazione che faresti a mente,
 * fatta da chi ha gia' i numeri sotto mano.
 */
export function fitsInRemaining(
  totals: MacroTotals,
  item: MacroSource,
  targets: Target = DAILY_TARGETS,
): FitVerdict {
  const exceeds = MACRO_ORDER.filter(
    (key) => totals[key] <= targets[key] && totals[key] + item[key] > targets[key],
  );
  return { fits: exceeds.length === 0, exceeds };
}

/** I macro gia' oltre target, da dire una volta sola invece che su ogni alimento. */
export function alreadyOver(
  totals: MacroTotals,
  targets: Target = DAILY_TARGETS,
): MacroKey[] {
  return MACRO_ORDER.filter((key) => totals[key] > targets[key]);
}
