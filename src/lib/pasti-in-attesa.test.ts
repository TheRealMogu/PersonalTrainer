import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggiungi,
  avvisoInAttesa,
  inAttesaDelGiorno,
  leggiInAttesa,
  MAX_IN_ATTESA,
  togli,
  type PastoInAttesa,
} from "./pasti-in-attesa";

const pasto = (clientId: string, extra: Partial<PastoInAttesa> = {}): PastoInAttesa => ({
  clientId,
  day: "2026-09-17",
  slot: "pranzo",
  name: "Riso e pollo",
  quantity: 1,
  kcal: 640,
  carbs: 88.4,
  protein: 45.6,
  fat: 12.5,
  onlyKcal: false,
  savedAt: 1_000,
  ...extra,
});

describe("accodare un pasto", () => {
  it("lo aggiunge in fondo", () => {
    const lista = aggiungi([pasto("a")], pasto("b"));
    assert.deepEqual(
      lista.map((p) => p.clientId),
      ["a", "b"],
    );
  });

  it("lo stesso identificativo non si accoda due volte", () => {
    // È il caso del doppio tocco su rete lenta: due tentativi, un pasto solo.
    const lista = aggiungi([pasto("a")], pasto("a"));
    assert.equal(lista.length, 1);
  });

  it("non modifica la lista di partenza", () => {
    const partenza = [pasto("a")];
    aggiungi(partenza, pasto("b"));
    assert.equal(partenza.length, 1);
  });

  it("oltre il tetto smette di accodare invece di riempire la memoria", () => {
    const piena = Array.from({ length: MAX_IN_ATTESA }, (_, i) => pasto(`p${i}`));
    assert.equal(aggiungi(piena, pasto("uno-di-troppo")).length, MAX_IN_ATTESA);
  });
});

describe("togliere dalla coda", () => {
  it("toglie solo quello giusto", () => {
    const lista = togli([pasto("a"), pasto("b")], "a");
    assert.deepEqual(
      lista.map((p) => p.clientId),
      ["b"],
    );
  });

  it("un identificativo che non c'è non rompe niente", () => {
    assert.equal(togli([pasto("a")], "z").length, 1);
  });
});

describe("i pasti in attesa di un giorno", () => {
  const lista = [
    pasto("c", { savedAt: 3_000 }),
    pasto("a", { savedAt: 1_000 }),
    pasto("b", { savedAt: 2_000 }),
    pasto("altro-giorno", { day: "2026-09-16", savedAt: 500 }),
  ];

  it("tiene l'ordine in cui li hai registrati, non quello in cui stanno in memoria", () => {
    assert.deepEqual(
      inAttesaDelGiorno(lista, "2026-09-17").map((p) => p.clientId),
      ["a", "b", "c"],
    );
  });

  it("non mescola i giorni", () => {
    assert.equal(inAttesaDelGiorno(lista, "2026-09-16").length, 1);
  });

  it("un giorno senza niente in coda è una lista vuota, non un errore", () => {
    assert.deepEqual(inAttesaDelGiorno(lista, "2026-01-01"), []);
  });
});

describe("rileggere la coda dalla memoria del telefono", () => {
  it("legge quello che aveva scritto", () => {
    const scritto = JSON.stringify([pasto("a"), pasto("b")]);
    assert.equal(leggiInAttesa(scritto).length, 2);
  });

  it("niente in memoria è una coda vuota", () => {
    assert.deepEqual(leggiInAttesa(null), []);
    assert.deepEqual(leggiInAttesa(""), []);
  });

  it("memoria rotta a metà non fa cadere il diario", () => {
    assert.deepEqual(leggiInAttesa('[{"clientId":"a",'), []);
    assert.deepEqual(leggiInAttesa('{"non":"una lista"}'), []);
  });

  it("butta le voci che non tornano e tiene le altre", () => {
    // Una versione vecchia dell'app può aver scritto righe di un'altra forma.
    // Perdere un pasto è meglio che perderli tutti.
    const misto = JSON.stringify([pasto("buono"), { clientId: "monco" }, null, 7]);
    assert.deepEqual(
      leggiInAttesa(misto).map((p) => p.clientId),
      ["buono"],
    );
  });

  it("un pasto senza onlyKcal diventa un pasto normale, non indefinito", () => {
    const senza = JSON.stringify([{ ...pasto("a"), onlyKcal: undefined }]);
    assert.equal(leggiInAttesa(senza)[0]?.onlyKcal, false);
  });
});

describe("l'avviso di quello che aspetta", () => {
  it("dice quanti sono e che ripartono da soli", () => {
    assert.match(avvisoInAttesa(1), /1 pasto/);
    assert.match(avvisoInAttesa(1), /da solo/);
    assert.match(avvisoInAttesa(3), /3 pasti/);
  });

  it("a coda vuota non dice niente", () => {
    assert.equal(avvisoInAttesa(0), "");
    assert.equal(avvisoInAttesa(-2), "");
  });

  it("non lo chiama errore: un pasto in coda non è perso", () => {
    for (const quanti of [1, 5]) {
      const testo = avvisoInAttesa(quanti);
      assert.doesNotMatch(testo, /errore|fallit|non riuscit|perso/i);
    }
  });
});
