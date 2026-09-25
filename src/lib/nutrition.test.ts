import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alreadyOver,
  arrotondaMacro,
  avvisoNonScomposte,
  buildInsight,
  buildProgress,
  etichettaScarto,
  fitsInRemaining,
  formatMacro,
  kcalNonScomposte,
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
    assert.equal(kcal.remaining, 1685);
    assert.equal(kcal.over, 0);
    assert.equal(kcal.isOver, false);
  });

  it("segnala lo sforo e non fa mai superare il 100% alla barra", () => {
    const progress = buildProgress(sumMacros(Array(6).fill(riso)));
    const kcal = progress.find((p) => p.key === "kcal")!;
    const carbs = progress.find((p) => p.key === "carbs")!;

    assert.equal(kcal.consumed, 2190);
    assert.equal(kcal.isOver, true);
    assert.equal(kcal.over, 140);
    assert.equal(kcal.remaining, 0);
    assert.equal(kcal.percent, 100);

    assert.equal(carbs.consumed, 468);
    assert.equal(carbs.over, 218);
  });

  it("tratta il target esatto come non sforato", () => {
    const progress = buildProgress({ ...DAILY_TARGETS });
    for (const item of progress) {
      assert.equal(
        item.isOver,
        false,
        `${item.key} non deve risultare oltre target`
      );
      assert.equal(item.remaining, 0);
      assert.equal(item.over, 0);
      assert.equal(item.percent, 100);
    }
  });

  it("restituisce i quattro macro nell'ordine della UI", () => {
    assert.deepEqual(
      buildProgress(sumMacros([])).map((p) => p.key),
      ["kcal", "carbs", "protein", "fat"]
    );
  });
});

describe("formatMacro", () => {
  it("arrotonda le kcal a intero", () => {
    assert.equal(formatMacro(184.6, "kcal"), "185");
  });

  it("tiene una cifra decimale sui grammi", () => {
    assert.equal(formatMacro(8.0999999, "fat"), "8,1");
    assert.equal(formatMacro(20, "protein"), "20");
  });

  it("scrive i decimali con la virgola, come i chili in palestra", () => {
    assert.equal(formatMacro(230.6, "carbs"), "230,6");
    assert.equal(formatMacro(12.5, "fat"), "12,5");
  });

  it("non lascia mai uscire un punto decimale", () => {
    for (const valore of [0.1, 1.05, 99.94, 230.6, 1845.5]) {
      for (const chiave of ["kcal", "carbs", "protein", "fat"] as const) {
        assert.ok(
          !formatMacro(valore, chiave).includes("."),
          `${valore} come ${chiave} e' uscito con il punto`
        );
      }
    }
  });

  it("le migliaia di kcal restano senza punto: e' l'anello, non un volume", () => {
    assert.equal(formatMacro(1845, "kcal"), "1845");
  });

  it("un intero non si porta dietro una virgola vuota", () => {
    assert.equal(formatMacro(45, "fat"), "45");
    assert.equal(formatMacro(45.0, "fat"), "45");
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
    assert.ok(
      !verdict.exceeds.includes("protein"),
      "le proteine ci stanno ancora"
    );
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
    const oltre = {
      kcal: DAILY_TARGETS.kcal - riso.kcal + 1,
      carbs: 0,
      protein: 0,
      fat: 0,
    };
    assert.deepEqual(fitsInRemaining(oltre, riso).exceeds, ["kcal"]);
  });

  it("non incolpa l'alimento per un macro gia' sforato", () => {
    // carboidrati gia' oltre: aggiungere riso li peggiora, ma non e' lui a
    // farli sforare, ed elencarlo renderebbe ogni cibo "proibito"
    const carboSforati = {
      kcal: 0,
      carbs: DAILY_TARGETS.carbs + 50,
      protein: 0,
      fat: 0,
    };
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
    assert.deepEqual(
      alreadyOver({ kcal: 0, carbs: 0, protein: 0, fat: 0 }),
      []
    );
    assert.deepEqual(
      alreadyOver({
        kcal: DAILY_TARGETS.kcal + 1,
        carbs: 0,
        protein: 0,
        fat: DAILY_TARGETS.fat + 1,
      }),
      ["kcal", "fat"]
    );
  });

  it("il target esatto non e' oltre", () => {
    assert.deepEqual(alreadyOver({ ...DAILY_TARGETS }), []);
  });
});

const pettoDiPollo = { ...pollo, name: "petto di pollo" };
const risoConNome = { ...riso, name: "riso" };
const colazioneConNome = { ...colazione, name: "colazione" };

describe("buildInsight", () => {
  it("dice kcal e proteine, come fa PRODOTTO.md a descriverlo", () => {
    const totals = { kcal: 500, carbs: 200, protein: 55, fat: 5 };
    const frase = buildInsight(totals, DAILY_TARGETS);
    assert.equal(
      frase,
      `Ti restano ${formatMacro(DAILY_TARGETS.kcal - 500, "kcal")} kcal e ${formatMacro(DAILY_TARGETS.protein - 55, "protein")} g di proteine.`
    );
  });

  it("propone gli alimenti che ci stanno ancora, dal piu' proteico", () => {
    const totals = { kcal: 0, carbs: 0, protein: 0, fat: 0 };
    const frase = buildInsight(totals, DAILY_TARGETS, [
      risoConNome,
      colazioneConNome,
      pettoDiPollo,
    ]);
    // pollo (46 g) e riso (7 g) battono la colazione (6.5 g) per proteine:
    // la colazione resta fuori dai primi due nonostante sia in mezzo alla lista
    assert.match(frase, /petto di pollo e riso ci stanno\.$/);
  });

  it("nomina un solo alimento con il verbo al singolare", () => {
    // resta solo margine per un alimento piccolo
    const totals = { kcal: DAILY_TARGETS.kcal - 200, carbs: 0, protein: 0, fat: 0 };
    const frase = buildInsight(totals, DAILY_TARGETS, [colazioneConNome]);
    assert.match(frase, /colazione ci sta\.$/);
  });

  it("senza alimenti che ci stanno, non propone niente", () => {
    const totals = { kcal: DAILY_TARGETS.kcal - 200, carbs: 0, protein: 0, fat: 0 };
    const frase = buildInsight(totals, DAILY_TARGETS, [risoConNome]); // 365 kcal, non ci sta in 200
    assert.ok(!frase.includes("—"));
    assert.ok(!frase.includes("ci sta"));
  });

  it("stringa vuota quando le kcal sono gia' a target o oltre", () => {
    assert.equal(buildInsight({ ...DAILY_TARGETS }, DAILY_TARGETS), "");
    assert.equal(
      buildInsight(
        { ...DAILY_TARGETS, kcal: DAILY_TARGETS.kcal + 50 },
        DAILY_TARGETS
      ),
      ""
    );
  });

  it("quando le proteine sono gia' a target, dice solo le kcal", () => {
    const totals = {
      kcal: 100,
      carbs: 0,
      protein: DAILY_TARGETS.protein + 1,
      fat: 0,
    };
    const frase = buildInsight(totals, DAILY_TARGETS);
    assert.equal(
      frase,
      `Ti restano ${formatMacro(DAILY_TARGETS.kcal - 100, "kcal")} kcal.`
    );
  });

  it("non incolpa: nessuna parola di valore nel testo", () => {
    const frase = buildInsight(
      { kcal: 500, carbs: 200, protein: 55, fat: 5 },
      DAILY_TARGETS
    );
    for (const parola of ["attenzione", "sforato", "male", "!"]) {
      assert.ok(!frase.toLowerCase().includes(parola));
    }
  });
});

describe("arrotondare un macro come numero", () => {
  it("dà lo stesso valore che formatMacro scrive", () => {
    for (const valore of [10.64, 0.5, 1845.4, 230.55, 0]) {
      for (const chiave of ["kcal", "carbs", "protein", "fat"] as const) {
        assert.equal(
          formatMacro(valore, chiave),
          String(arrotondaMacro(valore, chiave)).replace(".", ","),
          `${valore} come ${chiave}`,
        );
      }
    }
  });

  it("restituisce un numero, non un NaN: è il bug che ha reso necessaria questa funzione", () => {
    // `Number(formatMacro(10.6, "carbs"))` era NaN da quando il formattatore
    // scrive la virgola, e a schermo compariva "+NaN g".
    for (const valore of [10.6, 0.5, 105]) {
      const arrotondato = arrotondaMacro(valore, "carbs");
      assert.ok(Number.isFinite(arrotondato), `${valore} ha prodotto ${arrotondato}`);
    }
  });

  it("uno scarto che si arrotonda a zero è zero, non 0,04", () => {
    assert.equal(arrotondaMacro(0.04, "carbs"), 0);
    assert.equal(arrotondaMacro(0.4, "kcal"), 0);
  });
});

describe("calorie registrate senza macro", () => {
  const scomposto: MacroSource = {
    kcal: 640,
    carbs: 88.4,
    protein: 45.6,
    fat: 12.5,
  };
  const aOcchio: MacroSource & { onlyKcal: boolean } = {
    kcal: 350,
    carbs: 0,
    protein: 0,
    fat: 0,
    onlyKcal: true,
  };
  const zeroVeri: MacroSource = { kcal: 100, carbs: 0, protein: 0, fat: 0 };

  it("conta solo quelle segnate a occhio", () => {
    assert.equal(kcalNonScomposte([scomposto, aOcchio]), 350);
  });

  it("un pasto scomposto non ci entra, nemmeno se ha zero grammi di un macro", () => {
    assert.equal(kcalNonScomposte([zeroVeri]), 0);
  });

  it("senza pasti a occhio il totale è zero", () => {
    assert.equal(kcalNonScomposte([scomposto]), 0);
  });

  it("le somma tutte, non solo la prima", () => {
    assert.equal(kcalNonScomposte([aOcchio, scomposto, aOcchio]), 700);
  });

  it("non tocca la somma dei macro: quelle calorie restano nell'anello", () => {
    const totali = sumMacros([scomposto, aOcchio]);
    assert.equal(totali.kcal, 990);
    assert.equal(totali.carbs, 88.4);
    assert.equal(totali.protein, 45.6);
  });
});

describe("l'avviso delle calorie non scomposte", () => {
  it("dice quante sono, con la virgola come tutto il resto", () => {
    assert.match(avvisoNonScomposte(350), /350 kcal/);
    assert.match(avvisoNonScomposte(350), /senza macro/);
  });

  it("a zero non dice niente: una riga vuota è rumore tutti i giorni", () => {
    assert.equal(avvisoNonScomposte(0), "");
    assert.equal(avvisoNonScomposte(-10), "");
  });

  it("non incolpa: nessun punto esclamativo, nessun 'attenzione'", () => {
    const testo = avvisoNonScomposte(350);
    assert.doesNotMatch(testo, /!/);
    assert.doesNotMatch(testo, /attenzione|sbagli|dovresti/i);
  });
});

describe("l'etichetta dello scarto dal target", () => {
  it("dice sotto il target quando si è rimasti indietro", () => {
    assert.equal(etichettaScarto(-217, "kcal"), "−217 kcal · sotto il target");
  });

  it("dice sopra il target quando si è andati oltre", () => {
    assert.equal(etichettaScarto(217, "kcal"), "+217 kcal · sopra il target");
  });

  it("a zero non giudica: 'in linea', senza segno né freccia", () => {
    assert.equal(etichettaScarto(0, "kcal"), "in linea");
  });

  it("uno scarto che arrotonda a zero resta 'in linea', non '+0 kcal'", () => {
    assert.equal(etichettaScarto(0.4, "kcal"), "in linea");
  });

  it("descrive, non giudica: nessuna parola di valore nel testo", () => {
    const testo = etichettaScarto(-217, "kcal");
    assert.doesNotMatch(testo, /bene|male|attenzione|sbagli|dovresti|bravo/i);
  });

  it("segue il macro: la virgola italiana e l'unità giuste anche sui grammi", () => {
    assert.equal(etichettaScarto(-12.5, "fat"), "−12,5 g · sotto il target");
  });
});
