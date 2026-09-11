import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  axisMax,
  buildDateRange,
  buildHistoryStats,
  fillMissingDays,
  isLogged,
  type DailyTotals,
} from "./history";
import { DAILY_TARGETS } from "./targets";

function day(iso: string, kcal: number, carbs = 0, protein = 0, fat = 0): DailyTotals {
  return { day: iso, kcal, carbs, protein, fat };
}

describe("buildDateRange", () => {
  it("finisce sul giorno indicato e ha la lunghezza richiesta", () => {
    const range = buildDateRange("2026-09-20", 7);
    assert.equal(range.length, 7);
    assert.equal(range.at(0), "2026-09-14");
    assert.equal(range.at(-1), "2026-09-20");
  });

  it("attraversa il cambio di mese", () => {
    assert.deepEqual(buildDateRange("2026-09-02", 3), ["2026-08-31", "2026-09-01", "2026-09-02"]);
  });

  it("gestisce l'intervallo di 30 giorni", () => {
    const range = buildDateRange("2026-09-20", 30);
    assert.equal(range.length, 30);
    assert.equal(range.at(0), "2026-08-22");
  });
});

describe("fillMissingDays", () => {
  const range = buildDateRange("2026-09-20", 3);

  it("inserisce a zero i giorni senza pasti", () => {
    const filled = fillMissingDays([day("2026-09-20", 1800)], range);
    assert.deepEqual(filled.map((d) => d.day), range);
    assert.equal(filled[0].kcal, 0);
    assert.equal(filled[2].kcal, 1800);
  });

  it("mantiene l'ordine dell'intervallo anche con righe disordinate", () => {
    const filled = fillMissingDays([day("2026-09-20", 3), day("2026-09-18", 1)], range);
    assert.deepEqual(filled.map((d) => d.kcal), [1, 0, 3]);
  });

  it("ignora righe fuori dall'intervallo", () => {
    const filled = fillMissingDays([day("2026-01-01", 9999)], range);
    assert.deepEqual(filled.map((d) => d.kcal), [0, 0, 0]);
  });
});

describe("isLogged", () => {
  it("considera registrato un giorno con almeno un macro sopra zero", () => {
    assert.equal(isLogged(day("2026-09-20", 0, 0, 12)), true);
    assert.equal(isLogged(day("2026-09-20", 0)), false);
  });
});

describe("buildHistoryStats", () => {
  it("fa la media sui soli giorni registrati", () => {
    const days = [day("2026-09-18", 1000), day("2026-09-19", 0), day("2026-09-20", 2000)];
    const stats = buildHistoryStats(days);
    assert.equal(stats.loggedDays, 2);
    assert.equal(stats.totalDays, 3);
    // 1500, non 1000: il giorno vuoto non entra nella media.
    assert.equal(stats.averages.kcal, 1500);
  });

  it("non divide per zero quando non c'e' nulla di registrato", () => {
    const stats = buildHistoryStats([day("2026-09-20", 0), day("2026-09-19", 0)]);
    assert.equal(stats.loggedDays, 0);
    assert.deepEqual(stats.averages, { kcal: 0, carbs: 0, protein: 0, fat: 0 });
    assert.equal(stats.daysWithinTarget.kcal, 0);
  });

  it("conta i giorni entro il target, target esatto incluso", () => {
    const days = [
      day("2026-09-18", DAILY_TARGETS.kcal - 1),
      day("2026-09-19", DAILY_TARGETS.kcal),
      day("2026-09-20", DAILY_TARGETS.kcal + 1),
    ];
    assert.equal(buildHistoryStats(days).daysWithinTarget.kcal, 2);
  });

  it("non conta fra i giorni entro target quelli mai registrati", () => {
    const days = [day("2026-09-19", 0), day("2026-09-20", 1000)];
    const stats = buildHistoryStats(days);
    assert.equal(stats.daysWithinTarget.kcal, 1);
    assert.equal(stats.daysWithinTarget.fat, 1);
  });
});

describe("axisMax", () => {
  it("lascia sempre aria sopra il target, cosi' la linea non finisce sul bordo", () => {
    const max = axisMax([day("2026-09-20", 500)], "kcal");
    assert.ok(max > DAILY_TARGETS.kcal, "la scala deve superare il target");
    assert.ok(DAILY_TARGETS.kcal / max < 0.95, "il target non deve stare a filo del bordo");
  });

  it("si alza sopra il giorno piu' alto quando si sfora", () => {
    const max = axisMax([day("2026-09-20", 2500)], "kcal");
    assert.ok(max > 2500);
    assert.ok(2500 / max < 0.95);
  });

  it("regge una lista vuota senza scendere sotto il target", () => {
    assert.ok(axisMax([], "kcal") >= DAILY_TARGETS.kcal);
  });
});
