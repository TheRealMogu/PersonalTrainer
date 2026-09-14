import { DAILY_TARGETS, MACRO_ORDER, type MacroKey } from "./targets";
import { shiftIsoDate } from "./date";
import type { MacroTotals } from "./nutrition";

export type DailyTotals = MacroTotals & { day: string };

/** Elenco di date consecutive, dalla piu' vecchia alla piu' recente. */
export function buildDateRange(lastDay: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => shiftIsoDate(lastDay, index - days + 1));
}

/**
 * Allinea le righe del database all'intervallo, inserendo a zero i giorni
 * senza pasti: il grafico deve mostrare tutti i giorni, non solo quelli pieni.
 */
export function fillMissingDays(rows: DailyTotals[], range: string[]): DailyTotals[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return range.map(
    (day) => byDay.get(day) ?? { day, kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );
}

/** Un giorno conta come "registrato" se contiene almeno un pasto. */
export function isLogged(totals: DailyTotals): boolean {
  return MACRO_ORDER.some((key) => totals[key] > 0);
}

export type HistoryStats = {
  /** Giorni conclusi con almeno un pasto registrato. */
  loggedDays: number;
  /** Giorni conclusi nell'intervallo, cioe' senza contare oggi. */
  totalDays: number;
  /** Oggi ha gia' qualcosa registrato: serve solo per spiegarlo a schermo. */
  todayLogged: boolean;
  /**
   * Media sui soli giorni registrati: includere i giorni non compilati
   * abbasserebbe la media facendo sembrare di aver mangiato meno.
   */
  averages: MacroTotals;
  /** Giorni registrati entro il target, per macro. */
  daysWithinTarget: Record<MacroKey, number>;
};

/**
 * Statistiche sui giorni **conclusi**.
 *
 * Oggi resta fuori di proposito. A meta' giornata hai registrato un pasto su
 * quattro: farlo entrare nella media la dimezza e fa sembrare che tu stia
 * mangiando la meta' di quello che mangi. Peggio, "giorni entro il target"
 * conterebbe oggi come riuscito solo perche' non e' ancora finito: un premio
 * per una giornata che non e' successa.
 *
 * Nel grafico oggi si vede lo stesso: li' e' un dato, non una media.
 */
export function buildHistoryStats(days: DailyTotals[], today: string): HistoryStats {
  const conclusi = days.filter((day) => day.day !== today);
  const logged = conclusi.filter(isLogged);
  const todayRow = days.find((day) => day.day === today);

  const averages = { kcal: 0, carbs: 0, protein: 0, fat: 0 } as MacroTotals;
  const daysWithinTarget = { kcal: 0, carbs: 0, protein: 0, fat: 0 } as Record<MacroKey, number>;

  for (const key of MACRO_ORDER) {
    if (logged.length > 0) {
      const total = logged.reduce((sum, day) => sum + day[key], 0);
      averages[key] = total / logged.length;
    }
    daysWithinTarget[key] = logged.filter((day) => day[key] <= DAILY_TARGETS[key]).length;
  }

  return {
    loggedDays: logged.length,
    totalDays: conclusi.length,
    todayLogged: todayRow ? isLogged(todayRow) : false,
    averages,
    daysWithinTarget,
  };
}

/** Aria sopra il valore piu' alto, perche' la linea del target non finisca a filo del bordo. */
const HEADROOM = 1.12;

/**
 * Scala dell'asse Y: non scende mai sotto il target (cosi' la linea di
 * riferimento e' sempre nel grafico) e sale se un giorno lo supera.
 */
export function axisMax(days: DailyTotals[], key: MacroKey): number {
  const peak = days.reduce((max, day) => Math.max(max, day[key]), 0);
  return Math.max(DAILY_TARGETS[key], peak) * HEADROOM;
}
