import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPeso, ultimoPeso } from "./peso";

describe("scrivere il peso", () => {
  it("un decimale, con la virgola", () => {
    assert.equal(formatPeso(82.5), "82,5");
  });

  it("arrotonda a un decimale", () => {
    assert.equal(formatPeso(82.46), "82,5");
  });

  it("un numero intero non porta la virgola in coda", () => {
    assert.equal(formatPeso(80), "80");
  });
});

describe("l'ultimo peso in un intervallo", () => {
  it("null senza righe nell'intervallo", () => {
    assert.equal(ultimoPeso([], "2026-09-07", "2026-09-13"), null);
  });

  it("prende il piu' recente, non il primo della lista", () => {
    const righe = [
      { day: "2026-09-08", weightKg: 83 },
      { day: "2026-09-11", weightKg: 82.5 },
      { day: "2026-09-09", weightKg: 82.8 },
    ];
    assert.equal(ultimoPeso(righe, "2026-09-07", "2026-09-13"), 82.5);
  });

  it("ignora le righe fuori dall'intervallo", () => {
    const righe = [
      { day: "2026-09-01", weightKg: 85 }, // settimana prima
      { day: "2026-09-09", weightKg: 82.8 },
      { day: "2026-09-20", weightKg: 81 }, // settimana dopo
    ];
    assert.equal(ultimoPeso(righe, "2026-09-07", "2026-09-13"), 82.8);
  });

  it("gli estremi dell'intervallo contano", () => {
    const righe = [{ day: "2026-09-13", weightKg: 82 }];
    assert.equal(ultimoPeso(righe, "2026-09-07", "2026-09-13"), 82);
  });
});
