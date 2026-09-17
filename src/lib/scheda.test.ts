import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  confronta,
  leggiScheda,
  nessunCambiamento,
  promptPerScheda,
  stessaCosa,
  type GiornataAttuale,
  type GiornataProposta,
} from "./scheda";

const ATTUALE: GiornataAttuale[] = [
  {
    id: 1,
    label: "Day 1",
    focus: "Petto e tricipiti",
    esercizi: [
      { id: 10, name: "Panca piana", sets: 4, reps: "8-10", serieRegistrate: 48 },
      { id: 11, name: "Croci ai cavi", sets: 3, reps: "12", serieRegistrate: 12 },
    ],
  },
  {
    id: 2,
    label: "Day 2",
    focus: "Schiena",
    esercizi: [{ id: 20, name: "Trazioni", sets: 4, reps: "max", serieRegistrate: 20 }],
  },
];

const giornata = (
  etichetta: string,
  esercizi: [string, number, string][],
  focus = "",
): GiornataProposta => ({
  etichetta,
  focus,
  esercizi: esercizi.map(([nome, serie, ripetizioni]) => ({ nome, serie, ripetizioni })),
});

describe("leggere la scheda incollata", () => {
  const valido = '{"giornate":[{"etichetta":"Day 1","focus":"Petto","esercizi":[{"nome":"Panca","serie":4,"ripetizioni":"8-10"}]}]}';

  it("legge il JSON buono", () => {
    const esito = leggiScheda(valido);
    assert.ok(esito.ok);
    assert.equal(esito.giornate.length, 1);
    assert.equal(esito.giornate[0].esercizi[0].nome, "Panca");
  });

  it("lo trova anche dentro un blocco di codice", () => {
    const esito = leggiScheda("Ecco la scheda:\n```json\n" + valido + "\n```\nFammi sapere!");
    assert.ok(esito.ok);
  });

  it("lo trova anche con del testo intorno, senza blocco", () => {
    assert.ok(leggiScheda(`Certo! ${valido} Spero vada bene.`).ok);
  });

  it("un incolla vuoto viene spiegato", () => {
    const esito = leggiScheda("   ");
    assert.ok(!esito.ok);
    assert.match(esito.errore, /incollato/i);
  });

  it("senza JSON lo dice, invece di far finta di aver capito", () => {
    const esito = leggiScheda("Ciao, non ho capito cosa vuoi.");
    assert.ok(!esito.ok);
    assert.match(esito.errore, /JSON/i);
  });

  it("un JSON rotto viene spiegato", () => {
    const esito = leggiScheda('{"giornate":[{"etichetta":');
    assert.ok(!esito.ok);
  });

  it("una giornata senza esercizi non passa", () => {
    const esito = leggiScheda('{"giornate":[{"etichetta":"Day 1","esercizi":[]}]}');
    assert.ok(!esito.ok);
    assert.match(esito.errore, /esercizi/i);
  });

  it("un esercizio senza nome non passa, e dice dove", () => {
    const esito = leggiScheda(
      '{"giornate":[{"etichetta":"Day 7","esercizi":[{"serie":3,"ripetizioni":"10"}]}]}',
    );
    assert.ok(!esito.ok);
    assert.match(esito.errore, /Day 7/);
  });

  it("serie fuori scala non passano, e dicono quale esercizio", () => {
    const esito = leggiScheda(
      '{"giornate":[{"etichetta":"Day 1","esercizi":[{"nome":"Panca","serie":900,"ripetizioni":"8"}]}]}',
    );
    assert.ok(!esito.ok);
    assert.match(esito.errore, /Panca/);
    assert.match(esito.errore, /serie/i);
  });

  it("le ripetizioni restano testo: 'cedimento' è una ripetizione valida", () => {
    const esito = leggiScheda(
      '{"giornate":[{"etichetta":"Day 1","esercizi":[{"nome":"Panca","serie":3,"ripetizioni":"cedimento"}]}]}',
    );
    assert.ok(esito.ok);
    assert.equal(esito.giornate[0].esercizi[0].ripetizioni, "cedimento");
  });

  it("un numero come ripetizioni viene accettato e diventa testo", () => {
    const esito = leggiScheda(
      '{"giornate":[{"etichetta":"Day 1","esercizi":[{"nome":"Panca","serie":3,"ripetizioni":12}]}]}',
    );
    assert.ok(esito.ok);
    assert.equal(esito.giornate[0].esercizi[0].ripetizioni, "12");
  });

  it("una scheda vuota non passa", () => {
    const esito = leggiScheda('{"giornate":[]}');
    assert.ok(!esito.ok);
  });
});

describe("riconoscere lo stesso esercizio", () => {
  it("ignora maiuscole e spazi doppi", () => {
    assert.ok(stessaCosa("Panca piana", "panca  piana"));
    assert.ok(stessaCosa("  PANCA PIANA ", "Panca Piana"));
  });

  it("ignora gli accenti", () => {
    assert.ok(stessaCosa("Curl bicipiti", "Curl bicìpiti"));
  });

  it("due esercizi diversi restano diversi", () => {
    assert.ok(!stessaCosa("Panca piana", "Panca inclinata"));
  });
});

describe("confrontare la scheda nuova con quella di adesso", () => {
  it("riconosce quello che non cambia", () => {
    const c = confronta(ATTUALE, [
      giornata("Day 1", [
        ["Panca piana", 4, "8-10"],
        ["Croci ai cavi", 3, "12"],
      ]),
      giornata("Day 2", [["Trazioni", 4, "max"]]),
    ]);
    assert.equal(c.uguali.length, 3);
    assert.equal(c.cambiati.length, 0);
    assert.ok(nessunCambiamento(c));
  });

  it("riconosce serie e ripetizioni cambiate, e dice com'erano", () => {
    const c = confronta(ATTUALE, [
      giornata("Day 1", [
        ["Panca piana", 5, "6-8"],
        ["Croci ai cavi", 3, "12"],
      ]),
      giornata("Day 2", [["Trazioni", 4, "max"]]),
    ]);
    assert.equal(c.cambiati.length, 1);
    assert.deepEqual(c.cambiati[0].prima, { serie: 4, ripetizioni: "8-10" });
    assert.deepEqual(c.cambiati[0].dopo, { serie: 5, ripetizioni: "6-8" });
  });

  it("un esercizio nuovo finisce fra gli aggiunti, non fra i cambiati", () => {
    const c = confronta(ATTUALE, [
      giornata("Day 1", [
        ["Panca piana", 4, "8-10"],
        ["Croci ai cavi", 3, "12"],
        ["Dip alle parallele", 3, "10"],
      ]),
      giornata("Day 2", [["Trazioni", 4, "max"]]),
    ]);
    assert.equal(c.aggiunti.length, 1);
    assert.equal(c.aggiunti[0].nome, "Dip alle parallele");
    assert.equal(c.aggiunti[0].prima, undefined);
  });

  it("un esercizio che sparisce viene archiviato, e dice quante serie pesano", () => {
    const c = confronta(ATTUALE, [
      giornata("Day 1", [["Panca piana", 4, "8-10"]]),
      giornata("Day 2", [["Trazioni", 4, "max"]]),
    ]);
    assert.equal(c.archiviati.length, 1);
    assert.equal(c.archiviati[0].nome, "Croci ai cavi");
    assert.equal(c.archiviati[0].serieRegistrate, 12);
    assert.equal(c.serieDaArchiviare, 12);
  });

  it("una giornata che sparisce porta con sé i suoi esercizi", () => {
    const c = confronta(ATTUALE, [
      giornata("Day 1", [
        ["Panca piana", 4, "8-10"],
        ["Croci ai cavi", 3, "12"],
      ]),
    ]);
    assert.deepEqual(c.giornateArchiviate, ["Day 2"]);
    assert.equal(c.archiviati.length, 1);
    assert.equal(c.archiviati[0].nome, "Trazioni");
    assert.equal(c.serieDaArchiviare, 20);
  });

  it("somma le serie di tutto quello che esce: è il numero che pesa", () => {
    const c = confronta(ATTUALE, [giornata("Day 3", [["Stacchi", 3, "5"]])]);
    assert.equal(c.serieDaArchiviare, 48 + 12 + 20);
    assert.deepEqual(c.giornateAggiunte, ["Day 3"]);
    assert.deepEqual(c.giornateArchiviate.sort(), ["Day 1", "Day 2"]);
  });

  it("un nome scritto con maiuscole diverse non archivia niente", () => {
    // È il caso che romperebbe tutto in silenzio: "PANCA PIANA" trattata come
    // un esercizio nuovo vorrebbe dire 48 serie messe da parte per una
    // maiuscola.
    const c = confronta(ATTUALE, [
      giornata("day 1", [
        ["PANCA PIANA", 4, "8-10"],
        ["croci ai cavi", 3, "12"],
      ]),
      giornata("Day 2", [["Trazioni", 4, "max"]]),
    ]);
    assert.equal(c.archiviati.length, 0);
    assert.equal(c.serieDaArchiviare, 0);
    assert.equal(c.giornateArchiviate.length, 0);
  });

  it("uno spostato da una giornata all'altra esce da una ed entra nell'altra", () => {
    const c = confronta(ATTUALE, [
      giornata("Day 1", [["Panca piana", 4, "8-10"]]),
      giornata("Day 2", [
        ["Trazioni", 4, "max"],
        ["Croci ai cavi", 3, "12"],
      ]),
    ]);
    assert.equal(c.archiviati.length, 1);
    assert.equal(c.aggiunti.length, 1);
    assert.equal(c.archiviati[0].giornata, "Day 1");
    assert.equal(c.aggiunti[0].giornata, "Day 2");
  });

  it("da nessuna scheda a una scheda: tutto aggiunto, niente archiviato", () => {
    const c = confronta([], [giornata("Day 1", [["Panca", 3, "10"]])]);
    assert.equal(c.aggiunti.length, 1);
    assert.equal(c.archiviati.length, 0);
    assert.equal(c.serieDaArchiviare, 0);
    assert.ok(!nessunCambiamento(c));
  });
});

describe("il prompt da copiare", () => {
  it("si porta dietro la scheda di adesso", () => {
    const prompt = promptPerScheda(ATTUALE);
    assert.match(prompt, /Panca piana: 4×8-10/);
    assert.match(prompt, /Day 2 — Schiena/);
  });

  it("dice di tenere gli stessi nomi, ed è il punto", () => {
    assert.match(promptPerScheda(ATTUALE), /stesso identico nome/);
  });

  it("senza scheda lo dice, invece di mandare un elenco vuoto", () => {
    assert.match(promptPerScheda([]), /non ho nessuna scheda/i);
  });

  it("mostra il formato che vuole", () => {
    assert.match(promptPerScheda(ATTUALE), /"giornate"/);
    assert.match(promptPerScheda(ATTUALE), /"ripetizioni"/);
  });
});
