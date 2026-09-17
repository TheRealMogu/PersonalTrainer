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
    { ...EMPTY_TOTALS }
  );
}

/**
 * Le calorie registrate senza sapere da quali macro arrivano.
 *
 * Servono a non far mentire le barre. Se hai segnato 350 kcal mangiando
 * fuori, i carboidrati a schermo dicono "88,4 g" ed e' vero solo per i pasti
 * scomposti: dentro la giornata ce ne sono altri, semplicemente non si sa
 * quanti. Un'app che tace qui sta dando per zero un numero che non conosce,
 * ed e' la regola 5 al contrario.
 *
 * L'anello delle calorie invece resta giusto: quelle si sanno.
 */
export function kcalNonScomposte(
  items: { kcal: number; onlyKcal?: boolean }[]
): number {
  return items.reduce(
    (somma, item) => (item.onlyKcal ? somma + item.kcal : somma),
    0
  );
}

/**
 * La frase da mettere sotto le barre, una volta sola.
 *
 * Una volta sola e non su ogni macro: ripeterla tre volte trasformerebbe
 * un'informazione in un rimprovero, ed e' la regola 8. Stringa vuota quando
 * non c'e' niente da dichiarare, cosi' chi la usa non deve decidere.
 */
export function avvisoNonScomposte(kcal: number): string {
  if (kcal <= 0) return "";
  return `Più ${formatMacro(
    kcal,
    "kcal"
  )} kcal senza macro, registrate a occhio.`;
}

/**
 * Arrotonda e scrive per la UI: i grammi a una cifra decimale, le kcal a
 * intero.
 *
 * Il separatore decimale e' la virgola, come ovunque nell'app. Prima qui
 * usciva il punto -- `toString()` scrive alla maniera inglese -- e nella
 * stessa schermata si leggeva "12,5 kg" accanto a "C 230.6": due convenzioni
 * in tre centimetri.
 *
 * La virgola si mette a mano invece di passare da `toLocaleString`, che senza
 * opzioni esplicite non da' lo stesso risultato sul server e nel browser.
 * Trappola gia' pagata in questo repo, con un errore di idratazione a ogni
 * apertura.
 *
 * Le migliaia restano senza punto: "1845 kcal", non "1.845". Il volume in
 * palestra invece le raggruppa (`formatVolume`), ed e' una differenza voluta
 * -- li' i numeri arrivano a cinque cifre, qui si fermano a quattro, dove il
 * punto costa un carattere nell'anello e non fa guadagnare niente in
 * leggibilita'.
 */
export function formatMacro(value: number, key: MacroKey): string {
  const arrotondato =
    key === "kcal" ? Math.round(value) : Math.round(value * 10) / 10;
  return String(arrotondato).replace(".", ",");
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
  targets: Target = DAILY_TARGETS
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
  targets: Target = DAILY_TARGETS
): FitVerdict {
  const exceeds = MACRO_ORDER.filter(
    (key) =>
      totals[key] <= targets[key] && totals[key] + item[key] > targets[key]
  );
  return { fits: exceeds.length === 0, exceeds };
}

/** I macro gia' oltre target, da dire una volta sola invece che su ogni alimento. */
export function alreadyOver(
  totals: MacroTotals,
  targets: Target = DAILY_TARGETS
): MacroKey[] {
  return MACRO_ORDER.filter((key) => totals[key] > targets[key]);
}
