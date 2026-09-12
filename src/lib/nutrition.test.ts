import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alreadyOver,
  buildProgress,
  fitsInRemaining,
  formatMacro,
  sumMacros,
  type MacroSource,
} from "./nutrition";
import { DAILY_TARGETS } from "./targets";

const colazione: MacroSource = { kcal: 185, carbs: 32, protein: 6.5, fat: 3.5 };
const pollo: MacroSource = { kcal: 165, carbs: 0, protein: 46, fat: 3.6 };
const riso: MacroSource = { kcal: 365, carbs: 78, protein: 7, fat: 1 };

describe("sumMacros", () => {
  it("restituisce zero su lista vuota", () => {
    assert.deepEqual(sumMacros([]), { kcal: 0, carbs: 0, protein: 0, fat: 0 });
  });

  it("somma i macro di piu' pasti", () => {
    const totals = sumMacros([colazione, pollo, riso]);
    assert.equal(totals.kcal, 715);
    assert.equal(totals.carbs, 110);
    assert.equal(totals.protein, 59.5);
    assert.equal(Math.round(totals.fat * 10) / 10, 8.1);
  });

  it("non muta gli elementi in ingresso", () => {
    const input = { ...colazione };
    sumMacros([input]);
    assert.deepEqual(input, colazione);
  });
});

describe("buildProgress", () => {
  it("calcola quanto rimane quando si e' sotto target", () => {
    const [kcal] = buildProgress(sumMacros([riso]));
    assert.equal(kcal.key, "kcal");
    assert.equal(kcal.consumed, 365);
    assert.equal(kcal.target, DAILY_TARGETS.kcal);
    assert.equal(kcal.remaining, 1540);
    assert.equal(kcal.over, 0);
    assert.equal(kcal.isOver, false);
  });

  it("segnala lo sforo e non fa mai superare il 100% alla barra", () => {
    const progress = buildProgress(sumMacros(Array(6).fill(riso)));
    const kcal = progress.find((p) => p.key === "kcal")!;
    const carbs = progress.find((p) => p.key === "carbs")!;

    assert.equal(kcal.consumed, 2190);
    assert.equal(kcal.isOver, true);
    assert.equal(kcal.over, 285);
    assert.equal(kcal.remaining, 0);
    assert.equal(kcal.percent, 100);

    assert.equal(carbs.consumed, 468);
    assert.equal(carbs.over, 248);
  });

  it("tratta il target esatto come non sforato", () => {
    const progress = buildProgress({ ...DAILY_TARGETS });
    for (const item of progress) {
      assert.equal(item.isOver, false, `${item.key} non deve risultare oltre target`);
      assert.equal(item.remaining, 0);
      assert.equal(item.over, 0);
      assert.equal(item.percent, 100);
    }
  });

  it("restituisce i quattro macro nell'ordine della UI", () => {
    assert.deepEqual(
      buildProgress(sumMacros([])).map((p) => p.key),
      ["kcal", "carbs", "protein", "fat"],
    );
  });
});

describe("formatMacro", () => {
  it("arrotonda le kcal a intero", () => {
    assert.equal(formatMacro(184.6, "kcal"), "185");
  });

  it("tiene una cifra decimale sui grammi", () => {
    assert.equal(formatMacro(8.0999999, "fat"), "8.1");
    assert.equal(formatMacro(20, "protein"), "20");
  });
});

describe("fitsInRemaining", () => {
  const vuoto = { kcal: 0, carbs: 0, protein: 0, fat: 0 };

  it("a stomaco vuoto ci sta quasi tutto", () => {
    assert.deepEqual(fitsInRemaining(vuoto, riso), { fits: true, exceeds: [] });
  });

  it("dice quali macro sforerebbero, non solo che non ci sta", () => {
    const quasiPieno = { kcal: 1800, carbs: 200, protein: 100, fat: 44 };
    const verdict = fitsInRemaining(quasiPieno, riso);
    assert.equal(verdict.fits, false);
    assert.ok(verdict.exceeds.includes("kcal"));
    assert.ok(verdict.exceeds.includes("carbs"));
    assert.ok(!verdict.exceeds.includes("protein"), "le proteine ci stanno ancora");
  });

  it("il target esatto ci sta ancora, non e' sforo", () => {
    const aUnPelo = {
      kcal: DAILY_TARGETS.kcal - riso.kcal,
      carbs: DAILY_TARGETS.carbs - riso.carbs,
      protein: DAILY_TARGETS.protein - riso.protein,
      fat: DAILY_TARGETS.fat - riso.fat,
    };
    assert.equal(fitsInRemaining(aUnPelo, riso).fits, true);
  });

  it("un grammo oltre non ci sta piu'", () => {
    const oltre = { kcal: DAILY_TARGETS.kcal - riso.kcal + 1, carbs: 0, protein: 0, fat: 0 };
    assert.deepEqual(fitsInRemaining(oltre, riso).exceeds, ["kcal"]);
  });

  it("non incolpa l'alimento per un macro gia' sforato", () => {
    // carboidrati gia' oltre: aggiungere riso li peggiora, ma non e' lui a
    // farli sforare, ed elencarlo renderebbe ogni cibo "proibito"
    const carboSforati = { kcal: 0, carbs: DAILY_TARGETS.carbs + 50, protein: 0, fat: 0 };
    assert.deepEqual(fitsInRemaining(carboSforati, riso).exceeds, []);
  });

  it("segnala comunque i macro dove il margine c'e' ancora", () => {
    const misto = {
      kcal: DAILY_TARGETS.kcal + 100, // gia' oltre: non si conta
      carbs: DAILY_TARGETS.carbs - 10, // margine risicato: il riso lo sfora
      protein: 0,
      fat: 0,
    };
    assert.deepEqual(fitsInRemaining(misto, riso).exceeds, ["carbs"]);
  });
});

describe("alreadyOver", () => {
  it("elenca solo i macro gia' oltre", () => {
    assert.deepEqual(alreadyOver({ kcal: 0, carbs: 0, protein: 0, fat: 0 }), []);
    assert.deepEqual(
      alreadyOver({ kcal: DAILY_TARGETS.kcal + 1, carbs: 0, protein: 0, fat: DAILY_TARGETS.fat + 1 }),
      ["kcal", "fat"],
    );
  });

  it("il target esatto non e' oltre", () => {
    assert.deepEqual(alreadyOver({ ...DAILY_TARGETS }), []);
  });
});
