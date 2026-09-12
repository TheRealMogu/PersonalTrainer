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
  /** Giorni con almeno un pasto registrato. */
  loggedDays: number;
  totalDays: number;
  /**
   * Media sui soli giorni registrati: includere i giorni non compilati
   * abbasserebbe la media facendo sembrare di aver mangiato meno.
   */
  averages: MacroTotals;
  /** Giorni registrati entro il target, per macro. */
  daysWithinTarget: Record<MacroKey, number>;
};

export function buildHistoryStats(days: DailyTotals[]): HistoryStats {
  const logged = days.filter(isLogged);

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
    totalDays: days.length,
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
