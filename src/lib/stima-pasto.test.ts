import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { QuickFood } from "@/db/schema";
import {
  kcalDaMacro,
  normalizzaStima,
  riferimentiPerModello,
  stimaIncoerente,
  type AlimentoStimato,
} from "./stima-pasto";

function voce(patch: Record<string, unknown> = {}) {
  return {
    nome: "Pane integrale",
    porzione: "80 g",
    momento: "pranzo",
    kcal: 200,
    carboidrati: 38,
    proteine: 7,
    grassi: 1.6,
    quantita_supposta: false,
    ...patch,
  };
}

function alimento(patch: Partial<AlimentoStimato> = {}): AlimentoStimato {
  return {
    nome: "Pane integrale",
    porzione: "80 g",
    slot: "pranzo",
    kcal: 194,
    carbs: 38,
    protein: 7,
    fat: 1.6,
    supposta: false,
    ...patch,
  };
}

describe("normalizzaStima", () => {
  it("converte una risposta ben formata", () => {
    const { alimenti, nota } = normalizzaStima(
      { alimenti: [voce()], nota: "tutto chiaro" },
      "cena",
    );
    assert.equal(alimenti.length, 1);
    assert.deepEqual(alimenti[0], {
      nome: "Pane integrale",
      porzione: "80 g",
      slot: "pranzo",
      kcal: 200,
      carbs: 38,
      protein: 7,
      fat: 1.6,
      supposta: false,
    });
    assert.equal(nota, "tutto chiaro");
  });

  it("ripiega sul momento predefinito quando quello ricevuto non esiste", () => {
    const { alimenti } = normalizzaStima({ alimenti: [voce({ momento: "merenda" })] }, "cena");
    assert.equal(alimenti[0].slot, "cena");
  });

  it("scarta le righe senza nome", () => {
    const { alimenti } = normalizzaStima({ alimenti: [voce({ nome: "   " }), voce()] }, "cena");
    assert.equal(alimenti.length, 1);
  });

  it("scarta i numeri impossibili invece di salvarli", () => {
    const casi = [
      voce({ kcal: -5 }),
      voce({ kcal: 40000 }),
      voce({ carboidrati: "tanti" }),
      voce({ proteine: Number.NaN }),
      voce({ grassi: null }),
    ];
    for (const caso of casi) {
      const { alimenti } = normalizzaStima({ alimenti: [caso] }, "cena");
      assert.equal(alimenti.length, 0, `non doveva passare: ${JSON.stringify(caso)}`);
    }
  });

  it("accetta uno zero, che è un valore vero", () => {
    const { alimenti } = normalizzaStima(
      { alimenti: [voce({ nome: "Caffè", kcal: 2, carboidrati: 0, proteine: 0, grassi: 0 })] },
      "cena",
    );
    assert.equal(alimenti.length, 1);
    assert.equal(alimenti[0].carbs, 0);
  });

  it("taglia il nome al limite che il salvataggio accetta", () => {
    const { alimenti } = normalizzaStima({ alimenti: [voce({ nome: "a".repeat(300) })] }, "cena");
    assert.equal(alimenti[0].nome.length, 120);
  });

  it("non si fa dare in pasto venti pagine di alimenti", () => {
    const { alimenti } = normalizzaStima(
      { alimenti: Array.from({ length: 50 }, () => voce()) },
      "cena",
    );
    assert.equal(alimenti.length, 20);
  });

  it("regge una risposta che non è quella attesa", () => {
    for (const raw of [null, undefined, 42, "ciao", [], {}, { alimenti: "no" }]) {
      const stima = normalizzaStima(raw, "cena");
      assert.deepEqual(stima, { alimenti: [], nota: "" });
    }
  });

  it("segna la quantità supposta solo quando lo è davvero", () => {
    assert.equal(
      normalizzaStima({ alimenti: [voce({ quantita_supposta: true })] }, "cena").alimenti[0]
        .supposta,
      true,
    );
    assert.equal(
      normalizzaStima({ alimenti: [voce({ quantita_supposta: "si" })] }, "cena").alimenti[0]
        .supposta,
      false,
    );
  });
});

describe("kcalDaMacro", () => {
  it("applica 4, 4 e 9 per grammo", () => {
    assert.equal(kcalDaMacro({ carbs: 10, protein: 10, fat: 10 }), 170);
  });
});

describe("stimaIncoerente", () => {
  it("lascia passare una stima che torna", () => {
    // 38*4 + 7*4 + 1,6*9 = 194,4
    assert.equal(stimaIncoerente(alimento()), false);
  });

  it("tace sugli scarti piccoli, che sono arrotondamenti", () => {
    assert.equal(stimaIncoerente(alimento({ kcal: 170 })), false);
  });

  it("segnala le calorie che non tornano con i macro", () => {
    assert.equal(stimaIncoerente(alimento({ kcal: 600 })), true);
    assert.equal(stimaIncoerente(alimento({ kcal: 20 })), true);
  });

  it("non segnala un alimento senza calorie né macro", () => {
    assert.equal(
      stimaIncoerente(alimento({ kcal: 0, carbs: 0, protein: 0, fat: 0 })),
      false,
    );
  });
});

describe("riferimentiPerModello", () => {
  const foods: QuickFood[] = [
    {
      id: 1,
      name: "Fette biscottate",
      portion: "2 pezzi",
      kcal: 70,
      carbs: 13,
      protein: 2,
      fat: 1,
      sortOrder: 0,
    },
    {
      id: 2,
      name: "Albumi",
      portion: null,
      kcal: 52,
      carbs: 0.7,
      protein: 11,
      fat: 0.2,
      sortOrder: 1,
    },
  ];

  it("non dice niente se non c'è niente da dire", () => {
    assert.equal(riferimentiPerModello([]), "");
  });

  it("elenca i valori veri, con e senza porzione", () => {
    const testo = riferimentiPerModello(foods);
    assert.match(testo, /- Fette biscottate \(2 pezzi\): 70 kcal, C 13 g, P 2 g, G 1 g/);
    assert.match(testo, /- Albumi: 52 kcal/);
    assert.doesNotMatch(testo, /Albumi \(/);
  });
});
