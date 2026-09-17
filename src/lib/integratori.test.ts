import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  contaPresi,
  integratoriDelGiorno,
  MAX_DOSE,
  MAX_NOME,
  pulisciIntegratore,
  riassuntoIntegratori,
  validaIntegratore,
  type IntegratoreDelGiorno,
} from "./integratori";

describe("validare un integratore", () => {
  it("accetta nome e dose normali", () => {
    assert.equal(validaIntegratore({ nome: "Vitamina D", dose: "2000 UI" }), null);
  });

  it("accetta un integratore senza dose", () => {
    assert.equal(validaIntegratore({ nome: "Omega 3", dose: null }), null);
    assert.equal(validaIntegratore({ nome: "Omega 3", dose: "   " }), null);
  });

  it("rifiuta un nome vuoto, anche se fatto di spazi", () => {
    assert.match(validaIntegratore({ nome: "   ", dose: null }) ?? "", /nome/i);
  });

  it("rifiuta un nome piu' lungo del tetto", () => {
    const errore = validaIntegratore({ nome: "x".repeat(MAX_NOME + 1), dose: null });
    assert.match(errore ?? "", new RegExp(String(MAX_NOME)));
  });

  it("un nome lungo esattamente quanto il tetto passa", () => {
    assert.equal(validaIntegratore({ nome: "x".repeat(MAX_NOME), dose: null }), null);
  });

  it("rifiuta una dose piu' lunga del tetto", () => {
    const errore = validaIntegratore({ nome: "Magnesio", dose: "x".repeat(MAX_DOSE + 1) });
    assert.match(errore ?? "", new RegExp(String(MAX_DOSE)));
  });

  it("il nome si misura senza gli spazi ai bordi", () => {
    const nome = `  ${"x".repeat(MAX_NOME)}  `;
    assert.equal(validaIntegratore({ nome, dose: null }), null);
  });
});

describe("pulire un integratore", () => {
  it("toglie gli spazi ai bordi", () => {
    assert.deepEqual(pulisciIntegratore({ nome: "  Zinco  ", dose: "  1 cps " }), {
      nome: "Zinco",
      dose: "1 cps",
    });
  });

  it("una dose di soli spazi diventa nessuna dose, non una stringa vuota", () => {
    assert.deepEqual(pulisciIntegratore({ nome: "Zinco", dose: "   " }), {
      nome: "Zinco",
      dose: null,
    });
  });

  it("una dose assente resta assente", () => {
    assert.equal(pulisciIntegratore({ nome: "Zinco", dose: null }).dose, null);
  });
});

const elenco = (presi: boolean[]): IntegratoreDelGiorno[] =>
  presi.map((preso, indice) => ({
    id: indice + 1,
    nome: `Integratore ${indice + 1}`,
    dose: null,
    preso,
  }));

describe("contare quelli presi", () => {
  it("conta i presi sul totale", () => {
    assert.deepEqual(contaPresi(elenco([true, false, true])), {
      presi: 2,
      totale: 3,
      tutti: false,
    });
  });

  it("riconosce quando sono tutti presi", () => {
    assert.equal(contaPresi(elenco([true, true])).tutti, true);
  });

  it("un elenco vuoto non e' 'tutti presi'", () => {
    assert.deepEqual(contaPresi([]), { presi: 0, totale: 0, tutti: false });
  });
});

describe("la riga di riepilogo", () => {
  it("dice sempre su quanti e' fatta", () => {
    assert.equal(riassuntoIntegratori(elenco([true, false, false])), "1 di 3");
  });

  it("a elenco vuoto non scrive niente, nemmeno '0 di 0'", () => {
    assert.equal(riassuntoIntegratori([]), "");
  });

  it("quando sono tutti presi lo dice, senza esclamativi", () => {
    assert.equal(riassuntoIntegratori(elenco([true, true, true])), "Presi tutti");
    assert.equal(riassuntoIntegratori(elenco([true])), "Preso");
  });

  it("uno solo non ancora preso resta un conteggio", () => {
    assert.equal(riassuntoIntegratori(elenco([false])), "0 di 1");
  });
});

describe("l'elenco di un giorno", () => {
  const attivi = [
    { id: 7, name: "Vitamina D", dose: "2000 UI" },
    { id: 9, name: "Omega 3", dose: null },
  ];

  it("applica le spunte di quel giorno", () => {
    assert.deepEqual(integratoriDelGiorno(attivi, [9]), [
      { id: 7, nome: "Vitamina D", dose: "2000 UI", preso: false },
      { id: 9, nome: "Omega 3", dose: null, preso: true },
    ]);
  });

  it("nessuna spunta vuol dire nessuno preso quel giorno", () => {
    assert.deepEqual(
      integratoriDelGiorno(attivi, []).map((i) => i.preso),
      [false, false],
    );
  });

  it("mantiene l'ordine dell'elenco, non quello delle spunte", () => {
    assert.deepEqual(
      integratoriDelGiorno(attivi, [9, 7]).map((i) => i.id),
      [7, 9],
    );
  });

  it("una spunta di un integratore non piu' attivo non fa comparire righe", () => {
    // Puo' succedere: metti da parte un integratore e guardi un giorno in cui
    // lo prendevi. L'elenco e' quello degli attivi, le spunte sono solo un
    // filtro sopra -- non possono aggiungere niente.
    assert.equal(integratoriDelGiorno(attivi, [999]).length, 2);
    assert.deepEqual(
      integratoriDelGiorno(attivi, [999]).map((i) => i.preso),
      [false, false],
    );
  });

  it("senza integratori attivi l'elenco e' vuoto", () => {
    assert.deepEqual(integratoriDelGiorno([], [1, 2, 3]), []);
  });
});
