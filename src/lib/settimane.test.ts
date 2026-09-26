import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  confrontaSettimane,
  leggiSettimane,
  promptPerSettimane,
  type GiornataAttuale,
} from "./settimane";

const ATTUALI: GiornataAttuale[] = [
  {
    etichetta: "Day 1",
    esercizi: [
      { id: 1, name: "Panca piana" },
      { id: 3, name: "Spinte manubri panca piana" },
    ],
  },
  {
    etichetta: "Day 2",
    esercizi: [{ id: 2, name: "Trazioni" }],
  },
  {
    etichetta: "Day 3",
    esercizi: [{ id: 4, name: "Spinte manubri panca piana" }],
  },
];

describe("leggiSettimane", () => {
  it("rifiuta il testo vuoto", () => {
    assert.equal(leggiSettimane("").ok, false);
  });

  it("legge il JSON anche dentro un blocco di codice", () => {
    const risposta =
      "Ecco:\n```json\n" +
      JSON.stringify({
        giornate: [
          {
            etichetta: "Day 1",
            esercizi: [
              {
                nome: "Panca piana",
                settimane: [
                  { settimana: 1, ripetizioni: "8-10", peso: 40 },
                  { settimana: 2, ripetizioni: "8", peso: 42.5 },
                ],
              },
            ],
          },
        ],
      }) +
      "\n```\nFammi sapere.";
    const esito = leggiSettimane(risposta);
    assert.equal(esito.ok, true);
    if (!esito.ok) return;
    assert.equal(esito.giornate.length, 1);
    assert.equal(esito.giornate[0].esercizi.length, 1);
    assert.equal(esito.giornate[0].esercizi[0].settimane.length, 2);
    assert.equal(esito.giornate[0].esercizi[0].settimane[1].peso, 42.5);
  });

  it("rifiuta un carico non numerico o fuori tetto", () => {
    const base = {
      giornate: [
        {
          etichetta: "Day 1",
          esercizi: [
            {
              nome: "Panca piana",
              settimane: [{ settimana: 1, ripetizioni: "8", peso: 9999 }],
            },
          ],
        },
      ],
    };
    const esito = leggiSettimane(JSON.stringify(base));
    assert.equal(esito.ok, false);
  });

  it("rifiuta una settimana senza numero", () => {
    const esito = leggiSettimane(
      JSON.stringify({
        giornate: [
          {
            etichetta: "Day 1",
            esercizi: [
              {
                nome: "Panca piana",
                settimane: [{ ripetizioni: "8", peso: 40 }],
              },
            ],
          },
        ],
      }),
    );
    assert.equal(esito.ok, false);
  });
});

describe("confrontaSettimane", () => {
  it("abbina per giornata e nome, ignorando maiuscole e spazi doppi", () => {
    const confronto = confrontaSettimane(ATTUALI, [
      {
        etichetta: "Day 1",
        esercizi: [
          {
            nome: "panca  piana",
            settimane: [{ settimana: 1, ripetizioni: "8-10", peso: 40 }],
          },
        ],
      },
    ]);
    assert.equal(confronto.trovati.length, 1);
    assert.equal(confronto.trovati[0].id, 1);
    assert.equal(confronto.trovati[0].dayLabel, "Day 1");
    assert.equal(confronto.nonTrovati.length, 0);
  });

  it("distingue lo stesso nome su giornate diverse", () => {
    const confronto = confrontaSettimane(ATTUALI, [
      {
        etichetta: "Day 1",
        esercizi: [
          {
            nome: "Spinte manubri panca piana",
            settimane: [{ settimana: 1, ripetizioni: "7", peso: 10 }],
          },
        ],
      },
      {
        etichetta: "Day 3",
        esercizi: [
          {
            nome: "Spinte manubri panca piana",
            settimane: [{ settimana: 1, ripetizioni: "10", peso: 20 }],
          },
        ],
      },
    ]);
    assert.equal(confronto.trovati.length, 2);
    const day1 = confronto.trovati.find((t) => t.dayLabel === "Day 1");
    const day3 = confronto.trovati.find((t) => t.dayLabel === "Day 3");
    assert.equal(day1?.id, 3);
    assert.equal(day1?.settimane[0].peso, 10);
    assert.equal(day3?.id, 4);
    assert.equal(day3?.settimane[0].peso, 20);
  });

  it("mette da parte giornate ed esercizi che non corrispondono a niente, senza fermarsi", () => {
    const confronto = confrontaSettimane(ATTUALI, [
      {
        etichetta: "Day 1",
        esercizi: [
          {
            nome: "Squat",
            settimane: [{ settimana: 1, ripetizioni: "8", peso: 60 }],
          },
        ],
      },
      {
        etichetta: "Day 2",
        esercizi: [
          {
            nome: "Trazioni",
            settimane: [{ settimana: 1, ripetizioni: "max", peso: 0.5 }],
          },
        ],
      },
    ]);
    assert.equal(confronto.nonTrovati.length, 1);
    assert.equal(confronto.nonTrovati[0], "Day 1 — Squat");
    assert.equal(confronto.trovati.length, 1);
    assert.equal(confronto.trovati[0].nome, "Trazioni");
  });

  it("ordina le settimane di ogni esercizio", () => {
    const confronto = confrontaSettimane(ATTUALI, [
      {
        etichetta: "Day 1",
        esercizi: [
          {
            nome: "Panca piana",
            settimane: [
              { settimana: 2, ripetizioni: "8", peso: 42.5 },
              { settimana: 1, ripetizioni: "8-10", peso: 40 },
            ],
          },
        ],
      },
    ]);
    assert.deepEqual(
      confronto.trovati[0].settimane.map((s) => s.settimana),
      [1, 2],
    );
  });
});

describe("promptPerSettimane", () => {
  it("elenca le giornate e i nomi esatti degli esercizi, per non farli reinventare", () => {
    const prompt = promptPerSettimane(ATTUALI);
    assert.match(prompt, /Day 1/);
    assert.match(prompt, /Panca piana/);
    assert.match(prompt, /Day 2/);
    assert.match(prompt, /Trazioni/);
  });
});
