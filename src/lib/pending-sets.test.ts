import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_PENDING,
  addPending,
  newClientId,
  parsePending,
  pendingForSession,
  removePending,
  type PendingSet,
} from "./pending-sets";

function serie(over: Partial<PendingSet> = {}): PendingSet {
  return {
    clientId: "abc",
    sessionId: 1,
    exerciseId: 2,
    weight: 60,
    reps: 8,
    savedAt: 1000,
    ...over,
  };
}

describe("serie in attesa: lettura di quello che c'e' nel telefono", () => {
  it("su memoria vuota non si rompe", () => {
    assert.deepEqual(parsePending(null), []);
    assert.deepEqual(parsePending(""), []);
  });

  it("su spazzatura restituisce una lista vuota invece di lanciare", () => {
    assert.deepEqual(parsePending("{non json"), []);
    assert.deepEqual(parsePending('"una stringa"'), []);
    assert.deepEqual(parsePending("42"), []);
    assert.deepEqual(parsePending("null"), []);
  });

  it("butta le voci rotte e tiene le buone", () => {
    const raw = JSON.stringify([
      serie({ clientId: "buona" }),
      { clientId: "senza-peso", sessionId: 1, exerciseId: 2, reps: 8, savedAt: 1 },
      { non: "e' una serie" },
      serie({ clientId: "altra-buona" }),
    ]);
    const list = parsePending(raw);
    assert.deepEqual(list.map((p) => p.clientId), ["buona", "altra-buona"]);
  });

  it("rifiuta i numeri non validi, che romperebbero i conti", () => {
    assert.deepEqual(parsePending(JSON.stringify([serie({ weight: NaN })])), []);
    assert.deepEqual(parsePending(JSON.stringify([serie({ reps: 8.5 })])), []);
    assert.deepEqual(parsePending(JSON.stringify([serie({ sessionId: 1.5 })])), []);
  });

  it("non carica piu' del limite", () => {
    const tante = Array.from({ length: MAX_PENDING + 50 }, (_, i) => serie({ clientId: `s${i}` }));
    assert.equal(parsePending(JSON.stringify(tante)).length, MAX_PENDING);
  });
});

describe("serie in attesa: coda", () => {
  it("accoda in fondo", () => {
    const list = addPending([serie({ clientId: "a" })], serie({ clientId: "b" }));
    assert.deepEqual(list.map((p) => p.clientId), ["a", "b"]);
  });

  it("non accoda due volte lo stesso identificativo", () => {
    // Capita con un doppio tocco, o con un riprova partito due volte.
    const list = addPending([serie({ clientId: "a" })], serie({ clientId: "a", reps: 99 }));
    assert.equal(list.length, 1);
    assert.equal(list[0].reps, 8, "la voce gia' in coda non si sovrascrive");
  });

  it("al limite smette di accodare invece di riempire la memoria", () => {
    const piena = Array.from({ length: MAX_PENDING }, (_, i) => serie({ clientId: `s${i}` }));
    assert.equal(addPending(piena, serie({ clientId: "nuova" })).length, MAX_PENDING);
  });

  it("toglie per identificativo e lascia stare il resto", () => {
    const list = removePending([serie({ clientId: "a" }), serie({ clientId: "b" })], "a");
    assert.deepEqual(list.map((p) => p.clientId), ["b"]);
  });

  it("togliere qualcosa che non c'e' non cambia niente", () => {
    const list = [serie({ clientId: "a" })];
    assert.deepEqual(removePending(list, "boh"), list);
  });

  it("non modifica la lista che riceve", () => {
    const originale = [serie({ clientId: "a" })];
    addPending(originale, serie({ clientId: "b" }));
    removePending(originale, "a");
    assert.equal(originale.length, 1);
  });
});

describe("serie in attesa: per seduta", () => {
  it("tiene solo quelle della seduta e le ordina per quando sono state fatte", () => {
    const list = [
      serie({ clientId: "tardi", sessionId: 7, savedAt: 300 }),
      serie({ clientId: "altra-seduta", sessionId: 9, savedAt: 100 }),
      serie({ clientId: "presto", sessionId: 7, savedAt: 200 }),
    ];
    assert.deepEqual(
      pendingForSession(list, 7).map((p) => p.clientId),
      ["presto", "tardi"],
    );
  });
});

describe("identificativi", () => {
  it("non si ripetono", () => {
    const ids = new Set(Array.from({ length: 500 }, newClientId));
    assert.equal(ids.size, 500);
  });
});
