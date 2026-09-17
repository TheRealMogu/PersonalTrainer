import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  kcalDaiMacro,
  LIMITI_OBIETTIVI,
  OBIETTIVI_PREDEFINITI,
  validaObiettivi,
  type Obiettivi,
} from "./targets";
import { buildProgress, alreadyOver, fitsInRemaining } from "./nutrition";
import { buildHistoryStats } from "./history";
import { bicchieriDaMostrare, progressoAcqua } from "./acqua";

function obiettivi(patch: Partial<Obiettivi["macro"]> = {}, bicchieri = 8): Obiettivi {
  return { macro: { ...OBIETTIVI_PREDEFINITI.macro, ...patch }, bicchieriAcqua: bicchieri };
}

describe("validazione degli obiettivi", () => {
  it("i predefiniti sono validi, altrimenti l'app nasce rotta", () => {
    assert.equal(validaObiettivi(OBIETTIVI_PREDEFINITI), null);
  });

  it("dice cosa non va invece di correggere di nascosto", () => {
    const messaggio = validaObiettivi(obiettivi({ kcal: 10 }));
    assert.ok(messaggio);
    assert.match(messaggio, /calorie/i);
    assert.match(messaggio, new RegExp(String(LIMITI_OBIETTIVI.kcal.min)));
  });

  it("ferma i numeri fuori scala, in su e in giù", () => {
    assert.ok(validaObiettivi(obiettivi({ kcal: LIMITI_OBIETTIVI.kcal.max + 1 })));
    assert.ok(validaObiettivi(obiettivi({ carbs: -1 })));
    assert.ok(validaObiettivi(obiettivi({ protein: 1001 })));
    assert.ok(validaObiettivi(obiettivi({ fat: Number.NaN })));
    assert.ok(validaObiettivi(obiettivi({}, 0)));
    assert.ok(validaObiettivi(obiettivi({}, 31)));
    assert.ok(validaObiettivi(obiettivi({}, 2.5)));
  });

  it("nomina il macro sbagliato, non un generico 'valore non valido'", () => {
    assert.match(validaObiettivi(obiettivi({ protein: -5 }))!, /Proteine/);
    assert.match(validaObiettivi(obiettivi({ fat: -5 }))!, /Grassi/);
  });

  it("accetta zero grammi di un macro: è una dieta possibile, non un errore", () => {
    assert.equal(validaObiettivi(obiettivi({ carbs: 0 })), null);
  });
});

describe("coerenza fra kcal e macro", () => {
  it("applica 4, 4 e 9", () => {
    assert.equal(kcalDaiMacro({ kcal: 0, carbs: 10, protein: 10, fat: 10 }), 170);
  });

  it("non impone la coerenza: si dice, non si rifiuta", () => {
    // 220*4 + 155*4 + 45*9 = 1905, che è proprio il target di partenza
    assert.equal(kcalDaiMacro(OBIETTIVI_PREDEFINITI.macro), 1905);
    // ma anche dei numeri che non tornano restano validi
    assert.equal(validaObiettivi(obiettivi({ kcal: 3000 })), null);
  });
});

describe("i target si possono cambiare senza toccare il codice", () => {
  const totali = { kcal: 1000, carbs: 100, protein: 80, fat: 30 };

  it("il progresso si misura sui target che gli passi", () => {
    const predefinito = buildProgress(totali);
    const doppio = buildProgress(totali, { kcal: 3810, carbs: 440, protein: 310, fat: 90 });
    assert.ok(doppio[0].percent < predefinito[0].percent, "con target doppi la barra è più bassa");
    assert.equal(doppio[0].remaining, 2810);
  });

  it("senza target espliciti resta il comportamento di prima", () => {
    assert.deepEqual(buildProgress(totali), buildProgress(totali, OBIETTIVI_PREDEFINITI.macro));
  });

  it('"cosa ci sta ancora" segue i target nuovi', () => {
    const quasiPieno = { kcal: 1900, carbs: 215, protein: 150, fat: 44 };
    const cibo = { kcal: 100, carbs: 20, protein: 5, fat: 2 };
    assert.equal(fitsInRemaining(quasiPieno, cibo).fits, false);
    assert.equal(
      fitsInRemaining(quasiPieno, cibo, { kcal: 3000, carbs: 400, protein: 300, fat: 100 }).fits,
      true,
    );
  });

  it('"già oltre" segue i target nuovi', () => {
    const totaliAlti = { kcal: 2500, carbs: 300, protein: 200, fat: 60 };
    assert.ok(alreadyOver(totaliAlti).length > 0);
    assert.deepEqual(
      alreadyOver(totaliAlti, { kcal: 3000, carbs: 400, protein: 300, fat: 100 }),
      [],
    );
  });

  it("i giorni entro il target si contano sui target nuovi", () => {
    const giorni = [
      { day: "2026-09-07", kcal: 2200, carbs: 250, protein: 180, fat: 55 },
      { day: "2026-09-08", kcal: 1800, carbs: 210, protein: 150, fat: 40 },
    ];
    const stretto = buildHistoryStats(giorni, "2026-09-09");
    const largo = buildHistoryStats(giorni, "2026-09-09", {
      kcal: 3000,
      carbs: 400,
      protein: 300,
      fat: 100,
    });
    assert.equal(stretto.daysWithinTarget.kcal, 1);
    assert.equal(largo.daysWithinTarget.kcal, 2);
  });
});

describe("l'obiettivo dell'acqua si può cambiare", () => {
  it("cambia quanti ne restano e quando è raggiunto", () => {
    assert.equal(progressoAcqua(6, 6).raggiunto, true);
    assert.equal(progressoAcqua(6, 10).raggiunto, false);
    assert.equal(progressoAcqua(6, 10).restano, 4);
  });

  it("cambia quanti bicchieri si disegnano", () => {
    assert.equal(bicchieriDaMostrare(0, 12), 12);
    assert.equal(bicchieriDaMostrare(0, 4), 4);
  });

  it("un obiettivo impossibile non manda in pezzi il conto", () => {
    assert.equal(progressoAcqua(3, 0).obiettivo, 1);
    assert.ok(Number.isFinite(progressoAcqua(3, 0).percent));
    assert.equal(bicchieriDaMostrare(3, 0), 3);
  });

  it("senza obiettivo esplicito resta quello di prima", () => {
    assert.deepEqual(progressoAcqua(4), progressoAcqua(4, OBIETTIVI_PREDEFINITI.bicchieriAcqua));
  });
});
