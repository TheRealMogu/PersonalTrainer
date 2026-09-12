import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDayLabel, isIsoDate, shiftIsoDate, toIsoDate, todayIso } from "./date";

describe("todayIso", () => {
  it("usa il fuso italiano, non quello del server", () => {
    // 22:30 UTC del 20 settembre = 00:30 del 21 in Italia (ora legale, UTC+2).
    assert.equal(todayIso(new Date("2026-09-20T22:30:00Z")), "2026-09-21");
    // 23:30 UTC del 20 gennaio = 00:30 del 21 in Italia (ora solare, UTC+1).
    assert.equal(todayIso(new Date("2026-01-20T23:30:00Z")), "2026-01-21");
  });

  it("non sposta la data in pieno giorno", () => {
    assert.equal(todayIso(new Date("2026-09-20T12:00:00Z")), "2026-09-20");
  });
});

describe("isIsoDate", () => {
  it("accetta una data valida", () => {
    assert.equal(isIsoDate("2026-09-20"), true);
  });

  it("rifiuta giorni inesistenti", () => {
    assert.equal(isIsoDate("2026-02-30"), false);
    assert.equal(isIsoDate("2026-02-29"), false);
    assert.equal(isIsoDate("2026-13-01"), false);
    assert.equal(isIsoDate("2026-00-10"), false);
  });

  it("accetta il 29 febbraio negli anni bisestili", () => {
    assert.equal(isIsoDate("2028-02-29"), true);
  });

  it("rifiuta formati diversi da YYYY-MM-DD", () => {
    assert.equal(isIsoDate("2026-1-1"), false);
    assert.equal(isIsoDate("20/09/2026"), false);
    assert.equal(isIsoDate(""), false);
    assert.equal(isIsoDate("pippo"), false);
  });
});

describe("shiftIsoDate", () => {
  it("attraversa mese e anno", () => {
    assert.equal(shiftIsoDate("2026-08-31", 1), "2026-09-01");
    assert.equal(shiftIsoDate("2026-01-01", -1), "2025-12-31");
  });

  it("gestisce il 29 febbraio", () => {
    assert.equal(shiftIsoDate("2028-02-28", 1), "2028-02-29");
    assert.equal(shiftIsoDate("2026-02-28", 1), "2026-03-01");
  });

  it("non salta un giorno al cambio dell'ora", () => {
    // In Italia l'ora solare torna il 25 ottobre 2026.
    assert.equal(shiftIsoDate("2026-10-24", 1), "2026-10-25");
    assert.equal(shiftIsoDate("2026-10-25", 1), "2026-10-26");
    // E l'ora legale parte il 29 marzo 2026.
    assert.equal(shiftIsoDate("2026-03-28", 1), "2026-03-29");
    assert.equal(shiftIsoDate("2026-03-29", 1), "2026-03-30");
  });

  it("e' reversibile", () => {
    assert.equal(shiftIsoDate(shiftIsoDate("2026-09-20", -7), 7), "2026-09-20");
  });
});

describe("formatDayLabel", () => {
  const oggi = "2026-09-20";

  it("usa le etichette relative per i giorni vicini", () => {
    assert.equal(formatDayLabel(oggi, oggi), "Oggi");
    assert.equal(formatDayLabel("2026-09-19", oggi), "Ieri");
    assert.equal(formatDayLabel("2026-09-21", oggi), "Domani");
  });

  it("usa il formato compatto per gli altri giorni", () => {
    assert.equal(formatDayLabel("2026-09-25", oggi), "ven 25 set");
    assert.equal(formatDayLabel("2026-12-31", oggi), "gio 31 dic");
  });
});

describe("toIsoDate", () => {
  it("formatta in UTC senza sfasare il giorno", () => {
    assert.equal(toIsoDate(new Date("2026-03-01T00:00:00Z")), "2026-03-01");
    assert.equal(toIsoDate(new Date("2026-12-31T23:59:59Z")), "2026-12-31");
  });
});
