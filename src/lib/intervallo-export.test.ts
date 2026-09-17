import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  descriviIntervallo,
  leggiIntervallo,
  meseDi,
  settimanaDi,
  suffissoNome,
  TUTTO,
} from "./intervallo-export";

const leggi = (query: string) => leggiIntervallo(new URLSearchParams(query));

describe("leggere l'intervallo dalla query", () => {
  it("senza parametri esce tutto", () => {
    const esito = leggi("");
    assert.ok(esito.ok);
    assert.deepEqual(esito.intervallo, TUTTO);
  });

  it("legge le due date", () => {
    const esito = leggi("da=2026-09-14&a=2026-09-20");
    assert.ok(esito.ok);
    assert.deepEqual(esito.intervallo, { da: "2026-09-14", a: "2026-09-20" });
  });

  it("accetta un estremo solo", () => {
    const soloDa = leggi("da=2026-09-14");
    assert.ok(soloDa.ok);
    assert.deepEqual(soloDa.intervallo, { da: "2026-09-14", a: null });

    const soloA = leggi("a=2026-09-20");
    assert.ok(soloA.ok);
    assert.deepEqual(soloA.intervallo, { da: null, a: "2026-09-20" });
  });

  it("una data scritta male viene spiegata, non ignorata", () => {
    const esito = leggi("da=14-09-2026");
    assert.ok(!esito.ok);
    assert.match(esito.errore, /inizio/i);
    assert.match(esito.errore, /2026-09-14/);
  });

  it("dice quale delle due date è quella sbagliata", () => {
    const fine = leggi("da=2026-09-14&a=domani");
    assert.ok(!fine.ok);
    assert.match(fine.errore, /fine/i);
  });

  it("un intervallo al contrario non viene girato di nascosto", () => {
    const esito = leggi("da=2026-09-20&a=2026-09-14");
    assert.ok(!esito.ok);
    assert.match(esito.errore, /contrario/i);
  });

  it("un giorno solo è un intervallo valido", () => {
    const esito = leggi("da=2026-09-14&a=2026-09-14");
    assert.ok(esito.ok);
  });
});

describe("la settimana di un giorno", () => {
  it("va da lunedì a domenica", () => {
    // 17 settembre 2026 è un giovedì.
    assert.deepEqual(settimanaDi("2026-09-17"), { da: "2026-09-14", a: "2026-09-20" });
  });

  it("di lunedì la settimana comincia lo stesso giorno", () => {
    assert.deepEqual(settimanaDi("2026-09-14"), { da: "2026-09-14", a: "2026-09-20" });
  });

  it("di domenica non salta alla settimana dopo", () => {
    assert.deepEqual(settimanaDi("2026-09-20"), { da: "2026-09-14", a: "2026-09-20" });
  });
});

describe("il mese di un giorno", () => {
  it("dal primo all'ultimo giorno", () => {
    assert.deepEqual(meseDi("2026-09-17"), { da: "2026-09-01", a: "2026-09-30" });
  });

  it("conosce i mesi da 31", () => {
    assert.deepEqual(meseDi("2026-01-05"), { da: "2026-01-01", a: "2026-01-31" });
  });

  it("e febbraio, bisestile compreso", () => {
    assert.deepEqual(meseDi("2026-02-10"), { da: "2026-02-01", a: "2026-02-28" });
    assert.deepEqual(meseDi("2028-02-10"), { da: "2028-02-01", a: "2028-02-29" });
  });

  it("a dicembre non sfora nell'anno dopo", () => {
    assert.deepEqual(meseDi("2026-12-31"), { da: "2026-12-01", a: "2026-12-31" });
  });
});

describe("il nome del file dice cosa contiene", () => {
  it("un periodo si legge nel nome", () => {
    assert.equal(suffissoNome({ da: "2026-09-14", a: "2026-09-20" }, "2026-09-17"), "2026-09-14_2026-09-20");
  });

  it("tutto lo storico si distingue da un periodo", () => {
    const tutto = suffissoNome(TUTTO, "2026-09-17");
    const periodo = suffissoNome({ da: "2026-09-14", a: "2026-09-20" }, "2026-09-17");
    assert.notEqual(tutto, periodo);
    assert.match(tutto, /tutto/);
  });

  it("anche un estremo solo si vede dal nome", () => {
    assert.match(suffissoNome({ da: "2026-09-14", a: null }, "2026-09-17"), /dal-2026-09-14/);
    assert.match(suffissoNome({ da: null, a: "2026-09-20" }, "2026-09-17"), /fino-al-2026-09-20/);
  });
});

describe("descrivere l'intervallo a parole", () => {
  it("dice sempre di che periodo si tratta", () => {
    assert.equal(descriviIntervallo(TUTTO), "tutto lo storico");
    assert.equal(descriviIntervallo({ da: "2026-09-14", a: "2026-09-20" }), "dal 2026-09-14 al 2026-09-20");
    assert.equal(descriviIntervallo({ da: "2026-09-14", a: null }), "dal 2026-09-14 in poi");
    assert.equal(descriviIntervallo({ da: null, a: "2026-09-20" }), "fino al 2026-09-20");
  });

  it("non lascia mai la frase vuota: chi riceve il file deve sapere cosa guarda", () => {
    for (const intervallo of [
      TUTTO,
      { da: "2026-09-14", a: "2026-09-20" },
      { da: "2026-09-14", a: null },
      { da: null, a: "2026-09-20" },
    ]) {
      assert.ok(descriviIntervallo(intervallo).length > 0);
    }
  });
});
