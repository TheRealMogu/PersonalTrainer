import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  costruisciMese,
  giorniDelMese,
  indiceSettimana,
  nomeMese,
  riassuntoMese,
} from "./mese";
import type { DailyTotals } from "./history";

const giorno = (day: string, kcal: number): DailyTotals => ({
  day,
  kcal,
  carbs: 0,
  protein: 0,
  fat: 0,
});

describe("quanti giorni ha il mese", () => {
  it("conosce i mesi da 30 e da 31", () => {
    assert.equal(giorniDelMese("2026-09-17"), 30);
    assert.equal(giorniDelMese("2026-01-05"), 31);
  });

  it("e febbraio, bisestile compreso", () => {
    assert.equal(giorniDelMese("2026-02-10"), 28);
    assert.equal(giorniDelMese("2028-02-10"), 29);
  });

  it("dicembre non sfora nell'anno dopo", () => {
    assert.equal(giorniDelMese("2026-12-31"), 31);
  });
});

describe("il giorno della settimana", () => {
  it("il lunedì è il primo della riga", () => {
    // 14 settembre 2026 è un lunedì.
    assert.equal(indiceSettimana("2026-09-14"), 0);
    assert.equal(indiceSettimana("2026-09-20"), 6);
  });
});

describe("costruire il mese", () => {
  const oggi = "2026-09-17";

  it("ha una casella per ogni giorno del mese", () => {
    assert.equal(costruisciMese([], "2026-09-17", oggi).caselle.length, 30);
  });

  it("allinea il primo giorno alla colonna giusta", () => {
    // 1 settembre 2026 è un martedì: una casella vuota prima.
    assert.equal(costruisciMese([], "2026-09-17", oggi).vuotePrima, 1);
  });

  it("un giorno non registrato NON è un giorno a zero", () => {
    const griglia = costruisciMese(
      [giorno("2026-09-02", 1800)],
      "2026-09-17",
      oggi,
    );
    const secondo = griglia.caselle.find((c) => c.day === "2026-09-02");
    const terzo = griglia.caselle.find((c) => c.day === "2026-09-03");
    assert.equal(secondo?.stato, "entro");
    assert.equal(terzo?.stato, "non-registrato");
    // Non "oltre" e non "entro": non lo sappiamo.
    assert.notEqual(terzo?.stato, "entro");
    assert.notEqual(terzo?.stato, "oltre");
  });

  it("i giorni che devono ancora arrivare non contano come saltati", () => {
    const griglia = costruisciMese([], "2026-09-17", oggi);
    assert.equal(
      griglia.caselle.find((c) => c.day === "2026-09-30")?.stato,
      "futuro",
    );
    assert.equal(
      griglia.caselle.find((c) => c.day === "2026-09-01")?.stato,
      "non-registrato",
    );
  });

  it("distingue entro e oltre il target", () => {
    const griglia = costruisciMese(
      [giorno("2026-09-02", 1800), giorno("2026-09-03", 2400)],
      "2026-09-17",
      oggi,
      "kcal",
      1905,
    );
    assert.equal(
      griglia.caselle.find((c) => c.day === "2026-09-02")?.stato,
      "entro",
    );
    assert.equal(
      griglia.caselle.find((c) => c.day === "2026-09-03")?.stato,
      "oltre",
    );
  });

  it("esattamente al target conta come entro, non oltre", () => {
    const griglia = costruisciMese(
      [giorno("2026-09-02", 1905)],
      "2026-09-17",
      oggi,
      "kcal",
      1905,
    );
    assert.equal(
      griglia.caselle.find((c) => c.day === "2026-09-02")?.stato,
      "entro",
    );
  });

  it("oggi si disegna ma non entra nel conteggio", () => {
    // A mezzogiorno saresti sempre "entro": contarlo sarebbe un premio per
    // una giornata che non è ancora successa.
    const griglia = costruisciMese(
      [giorno(oggi, 600)],
      "2026-09-17",
      oggi,
      "kcal",
      1905,
    );
    assert.equal(griglia.caselle.find((c) => c.day === oggi)?.stato, "entro");
    assert.equal(griglia.registrati, 0);
    assert.equal(griglia.entro, 0);
  });

  it("conta i giorni conclusi e quanti erano entro", () => {
    const griglia = costruisciMese(
      [
        giorno("2026-09-02", 1800),
        giorno("2026-09-03", 2400),
        giorno("2026-09-04", 1700),
      ],
      "2026-09-17",
      oggi,
      "kcal",
      1905,
    );
    assert.equal(griglia.registrati, 3);
    assert.equal(griglia.entro, 2);
  });

  it("segue il macro che gli si chiede, non sempre le calorie", () => {
    const misto: DailyTotals = {
      day: "2026-09-02",
      kcal: 3000,
      carbs: 100,
      protein: 100,
      fat: 30,
    };
    assert.equal(
      costruisciMese([misto], "2026-09-17", oggi, "kcal", 1905).caselle.find(
        (c) => c.day === "2026-09-02",
      )?.stato,
      "oltre",
    );
    assert.equal(
      costruisciMese([misto], "2026-09-17", oggi, "carbs", 220).caselle.find(
        (c) => c.day === "2026-09-02",
      )?.stato,
      "entro",
    );
  });

  it("un mese passato non ha giorni futuri", () => {
    const griglia = costruisciMese([], "2026-08-10", oggi);
    assert.equal(griglia.caselle.filter((c) => c.stato === "futuro").length, 0);
  });
});

describe("il nome del mese", () => {
  it("è in italiano", () => {
    assert.equal(nomeMese("2026-09-17"), "settembre");
    assert.equal(nomeMese("2026-01-01"), "gennaio");
    assert.equal(nomeMese("2026-12-31"), "dicembre");
  });
});

describe("il riassunto del mese", () => {
  it("dichiara su quanti giorni è fatto", () => {
    const griglia = costruisciMese(
      [giorno("2026-09-02", 1800), giorno("2026-09-03", 2400)],
      "2026-09-17",
      "2026-09-17",
      "kcal",
      1905,
    );
    assert.match(
      riassuntoMese(griglia),
      /1 giorno entro il target su 2 registrati/,
    );
  });

  it("senza dati lo dice, invece di scrivere '0 su 0'", () => {
    const vuoto = costruisciMese([], "2026-09-17", "2026-09-17");
    assert.match(riassuntoMese(vuoto), /Nessun giorno registrato/);
    assert.doesNotMatch(riassuntoMese(vuoto), /0 su 0/);
  });
});
