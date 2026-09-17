import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  etichettaUltimaVolta,
  kcalDaRipetere,
  ordinaPerMomento,
  QUANTI_SUBITO,
  type UltimaVolta,
  type UsoPerMomento,
} from "./abitudini";

const cibo = (id: number, name: string, sortOrder = id) => ({
  id,
  name,
  sortOrder,
});

const ARCHIVIO = [
  cibo(1, "Avena"),
  cibo(2, "Petto di pollo"),
  cibo(3, "Yogurt greco"),
  cibo(4, "Riso"),
];

const nomi = (lista: { name: string }[]) => lista.map((f) => f.name);

describe("ordinare i tasti per momento della giornata", () => {
  const usi: UsoPerMomento[] = [
    { name: "Avena", slot: "colazione", volte: 20 },
    { name: "Yogurt greco", slot: "colazione", volte: 8 },
    { name: "Yogurt greco", slot: "spuntino", volte: 3 },
    { name: "Petto di pollo", slot: "cena", volte: 15 },
    { name: "Riso", slot: "pranzo", volte: 12 },
  ];

  it("a colazione mette in cima quello che fai a colazione", () => {
    assert.deepEqual(nomi(ordinaPerMomento(ARCHIVIO, usi, "colazione")), [
      "Avena",
      "Yogurt greco",
      "Petto di pollo",
      "Riso",
    ]);
  });

  it("a cena l'ordine cambia da solo", () => {
    assert.equal(
      nomi(ordinaPerMomento(ARCHIVIO, usi, "cena"))[0],
      "Petto di pollo"
    );
  });

  it("chi non lo mangi in questo momento viene dopo, anche se lo mangi spesso", () => {
    // Il pollo ha 15 usi totali contro gli 11 dello yogurt, ma a colazione
    // fai lo yogurt: quello che serve adesso viene prima del più frequente.
    const ordinati = nomi(ordinaPerMomento(ARCHIVIO, usi, "colazione"));
    assert.ok(
      ordinati.indexOf("Yogurt greco") < ordinati.indexOf("Petto di pollo")
    );
  });

  it("fra due mai usati vince l'ordine dell'archivio, non il caso", () => {
    const ordinati = ordinaPerMomento(ARCHIVIO, [], "colazione");
    assert.deepEqual(nomi(ordinati), [
      "Avena",
      "Petto di pollo",
      "Yogurt greco",
      "Riso",
    ]);
  });

  it("senza storia non inventa un ordine: resta quello che hai deciso tu", () => {
    const mescolati = [
      cibo(3, "Terzo", 3),
      cibo(1, "Primo", 1),
      cibo(2, "Secondo", 2),
    ];
    assert.deepEqual(nomi(ordinaPerMomento(mescolati, [], "pranzo")), [
      "Primo",
      "Secondo",
      "Terzo",
    ]);
  });

  it("non cambia l'elenco di partenza", () => {
    const copia = [...ARCHIVIO];
    ordinaPerMomento(ARCHIVIO, usi, "cena");
    assert.deepEqual(ARCHIVIO, copia);
  });

  it("restituisce tutti gli alimenti, non ne perde nessuno", () => {
    assert.equal(
      ordinaPerMomento(ARCHIVIO, usi, "spuntino").length,
      ARCHIVIO.length
    );
  });

  it("un uso di un alimento che non è più in archivio non rompe niente", () => {
    const conFantasma: UsoPerMomento[] = [
      ...usi,
      { name: "Alimento cancellato", slot: "cena", volte: 99 },
    ];
    assert.equal(ordinaPerMomento(ARCHIVIO, conFantasma, "cena").length, 4);
  });

  it("somma gli usi dello stesso alimento nello stesso momento", () => {
    const doppi: UsoPerMomento[] = [
      { name: "Riso", slot: "cena", volte: 3 },
      { name: "Riso", slot: "cena", volte: 4 },
      { name: "Avena", slot: "cena", volte: 6 },
    ];
    assert.equal(nomi(ordinaPerMomento(ARCHIVIO, doppi, "cena"))[0], "Riso");
  });
});

describe("quanti tasti si mostrano subito", () => {
  it("sono meno di dodici: la griglia piena costava tre gesti per vedere i pasti", () => {
    assert.ok(QUANTI_SUBITO < 12);
    assert.ok(QUANTI_SUBITO >= 4);
  });

  it("sono pari, così la griglia a due colonne non resta zoppa", () => {
    assert.equal(QUANTI_SUBITO % 2, 0);
  });
});

describe("l'etichetta di 'come l'ultima volta'", () => {
  const ultima = (day: string): UltimaVolta => ({
    day,
    slot: "colazione",
    pasti: [],
  });

  it("dice 'ieri' solo se è davvero ieri", () => {
    assert.equal(
      etichettaUltimaVolta(ultima("2026-09-16"), "2026-09-17", "2026-09-16"),
      "Come ieri"
    );
  });

  it("negli altri casi dice il giorno, invece di far credere che sia ieri", () => {
    const etichetta = etichettaUltimaVolta(
      ultima("2026-09-14"),
      "2026-09-17",
      "2026-09-16"
    );
    assert.doesNotMatch(etichetta, /ieri/);
    assert.match(etichetta, /lunedì/);
  });

  it("oltre la settimana aggiunge il giorno del mese, perché 'mercoledì' non basta più", () => {
    // 2026-09-09 è un mercoledì, otto giorni prima del 17.
    const etichetta = etichettaUltimaVolta(
      ultima("2026-09-09"),
      "2026-09-17",
      "2026-09-16"
    );
    assert.match(etichetta, /mercoledì 9/);
  });

  it("entro la settimana il giorno del mese non serve", () => {
    assert.equal(
      etichettaUltimaVolta(ultima("2026-09-14"), "2026-09-17", "2026-09-16"),
      "Come lunedì"
    );
  });
});

describe("le calorie di quello che si ricopia", () => {
  it("si sommano, così si vedono prima di toccare", () => {
    const ultima: UltimaVolta = {
      day: "2026-09-16",
      slot: "colazione",
      pasti: [
        {
          name: "Avena",
          quantity: 1,
          kcal: 350,
          carbs: 60,
          protein: 12,
          fat: 6,
          onlyKcal: false,
        },
        {
          name: "Yogurt",
          quantity: 1,
          kcal: 120,
          carbs: 6,
          protein: 20,
          fat: 0,
          onlyKcal: false,
        },
      ],
    };
    assert.equal(kcalDaRipetere(ultima), 470);
  });

  it("senza pasti è zero, e chi lo usa può decidere di non mostrare niente", () => {
    assert.equal(
      kcalDaRipetere({ day: "2026-09-16", slot: "cena", pasti: [] }),
      0
    );
  });
});
