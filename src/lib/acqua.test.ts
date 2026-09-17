import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bicchieriDaMostrare,
  formatAcqua,
  MAX_BICCHIERI,
  progressoAcqua,
} from "./acqua";
import { OBIETTIVO_ACQUA } from "./targets";

describe("come si scrive l'acqua", () => {
  it("sotto il litro conta in millilitri", () => {
    assert.equal(formatAcqua(0), "0 ml");
    assert.equal(formatAcqua(250), "250 ml");
    assert.equal(formatAcqua(750), "750 ml");
    assert.equal(formatAcqua(999), "999 ml");
  });

  it("dal litro in su conta in litri, con la virgola italiana", () => {
    assert.equal(formatAcqua(1000), "1 L");
    assert.equal(formatAcqua(1250), "1,25 L");
    assert.equal(formatAcqua(1500), "1,5 L");
    assert.equal(formatAcqua(2000), "2 L");
  });

  it("non lascia zeri inutili in coda", () => {
    assert.doesNotMatch(formatAcqua(1500), /1,50/);
    assert.doesNotMatch(formatAcqua(2000), /2,0/);
  });

  it("non usa mai il punto come separatore decimale", () => {
    for (const ml of [1000, 1250, 1750, 2500, 7500]) {
      assert.doesNotMatch(formatAcqua(ml), /\d\.\d/, String(ml));
    }
  });
});

describe("a che punto sei con l'acqua", () => {
  it("parte da zero senza inventare niente", () => {
    const p = progressoAcqua(0);
    assert.equal(p.bicchieri, 0);
    assert.equal(p.ml, 0);
    assert.equal(p.restano, OBIETTIVO_ACQUA.bicchieri);
    assert.equal(p.raggiunto, false);
    assert.equal(p.percent, 0);
  });

  it("conta i millilitri dai bicchieri", () => {
    assert.equal(progressoAcqua(4).ml, 4 * OBIETTIVO_ACQUA.mlPerBicchiere);
    assert.equal(progressoAcqua(8).ml, 2000);
  });

  it("all'obiettivo è raggiunto, e non serve altro", () => {
    const p = progressoAcqua(OBIETTIVO_ACQUA.bicchieri);
    assert.equal(p.raggiunto, true);
    assert.equal(p.restano, 0);
    assert.equal(p.percent, 100);
  });

  it("oltre l'obiettivo non va sopra il cento per cento né sotto zero di restanti", () => {
    const p = progressoAcqua(OBIETTIVO_ACQUA.bicchieri + 5);
    assert.equal(p.percent, 100);
    assert.equal(p.restano, 0);
    assert.equal(p.raggiunto, true);
  });

  it("i numeri impossibili vengono riportati dentro invece di propagarsi", () => {
    assert.equal(progressoAcqua(-3).bicchieri, 0);
    assert.equal(progressoAcqua(1000).bicchieri, MAX_BICCHIERI);
    assert.equal(progressoAcqua(2.4).bicchieri, 2);
    assert.equal(progressoAcqua(2.6).bicchieri, 3);
  });
});

describe("quanti bicchieri si disegnano", () => {
  it("almeno quelli dell'obiettivo", () => {
    assert.equal(bicchieriDaMostrare(0), OBIETTIVO_ACQUA.bicchieri);
    assert.equal(bicchieriDaMostrare(3), OBIETTIVO_ACQUA.bicchieri);
  });

  it("chi beve di più li vede in più, invece di un contatore che si ferma", () => {
    assert.equal(bicchieriDaMostrare(OBIETTIVO_ACQUA.bicchieri + 2), OBIETTIVO_ACQUA.bicchieri + 2);
  });

  it("ma non oltre il tetto", () => {
    assert.equal(bicchieriDaMostrare(500), MAX_BICCHIERI);
  });
});
