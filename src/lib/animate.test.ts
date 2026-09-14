import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { easeOut, valoreIntermedio } from "./animate";

describe("scorrimento dei numeri", () => {
  it("parte dal valore vecchio e arriva a quello nuovo", () => {
    assert.equal(valoreIntermedio(100, 200, 0), 100);
    assert.equal(valoreIntermedio(100, 200, 1), 200);
  });

  it("non esce dall'intervallo se il tempo sfora", () => {
    assert.equal(valoreIntermedio(100, 200, -5), 100);
    assert.equal(valoreIntermedio(100, 200, 9), 200);
  });

  it("rallenta arrivando: a meta' tempo ha gia' fatto piu' di meta' strada", () => {
    assert.ok(valoreIntermedio(0, 100, 0.5) > 50);
  });

  it("funziona anche all'indietro", () => {
    // Aggiungere un cibo fa scendere le calorie rimaste.
    assert.equal(valoreIntermedio(1750, 1645, 0), 1750);
    assert.equal(valoreIntermedio(1750, 1645, 1), 1645);
    assert.ok(valoreIntermedio(1750, 1645, 0.5) < 1750);
  });

  it("se il valore non cambia resta fermo", () => {
    for (const t of [0, 0.3, 1]) assert.equal(valoreIntermedio(42, 42, t), 42);
  });

  it("la curva resta fra zero e uno", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const v = easeOut(t);
      assert.ok(v >= 0 && v <= 1, `t=${t} -> ${v}`);
    }
    assert.equal(easeOut(0), 0);
    assert.equal(easeOut(1), 1);
  });
});
