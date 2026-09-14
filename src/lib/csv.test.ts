import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toCsv } from "./csv";

/** Toglie BOM e a capo finale, per confrontare solo il contenuto. */
function corpo(csv: string): string[] {
  return csv.replace(/^﻿/, "").trimEnd().split("\r\n");
}

describe("CSV", () => {
  it("scrive intestazione e righe", () => {
    assert.deepEqual(corpo(toCsv(["a", "b"], [[1, 2], [3, 4]])), ["a,b", "1,2", "3,4"]);
  });

  it("quota le celle con la virgola, altrimenti le colonne si spostano", () => {
    assert.deepEqual(corpo(toCsv(["nome"], [["Riso, pasta"]])), ["nome", '"Riso, pasta"']);
  });

  it("raddoppia le virgolette dentro le virgolette", () => {
    assert.deepEqual(corpo(toCsv(["nome"], [['Petto "grande"']])), ["nome", '"Petto ""grande"""']);
  });

  it("quota anche gli a capo", () => {
    const csv = toCsv(["nota"], [["prima\nseconda"]]);
    assert.ok(csv.includes('"prima\nseconda"'));
  });

  it("le celle vuote non diventano la scritta null", () => {
    assert.deepEqual(corpo(toCsv(["a", "b", "c"], [[null, undefined, 0]])), ["a,b,c", ",,0"]);
  });

  it("comincia con il BOM e usa CRLF, o Excel lo apre male", () => {
    const csv = toCsv(["à"], [["è"]]);
    assert.ok(csv.startsWith("﻿"), "manca il BOM");
    assert.ok(csv.includes("\r\n"), "mancano i CRLF");
  });

  it("senza righe resta la sola intestazione", () => {
    assert.deepEqual(corpo(toCsv(["a", "b"], [])), ["a,b"]);
  });
});
