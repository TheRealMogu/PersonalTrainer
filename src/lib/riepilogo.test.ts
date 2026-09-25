import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  costruisciRiepilogo,
  numeroSettimana,
  riepilogoTesto,
  type SedutaRiepilogo,
} from "./riepilogo";
import type { DailyTotals } from "./history";

function giorno(day: string, kcal: number): DailyTotals {
  return { day, kcal, carbs: kcal / 8, protein: kcal / 12, fat: kcal / 40 };
}

const SEDUTE: SedutaRiepilogo[] = [
  {
    day: "2026-09-08",
    label: "Day 1",
    focus: "Push",
    volume: 4548,
    setCount: 24,
  },
  {
    day: "2026-09-10",
    label: "Day 2",
    focus: "Pull",
    volume: 3910,
    setCount: 22,
  },
  // fuori settimana: non deve entrare
  {
    day: "2026-09-15",
    label: "Day 3",
    focus: "Full Body",
    volume: 5000,
    setCount: 20,
  },
];

describe("costruisciRiepilogo", () => {
  it("prende sempre lunedì–domenica, da qualunque giorno lo chiedi", () => {
    for (const data of ["2026-09-07", "2026-09-10", "2026-09-13"]) {
      const r = costruisciRiepilogo([], [], data, "2026-09-13");
      assert.equal(r.lunedi, "2026-09-07", data);
      assert.equal(r.domenica, "2026-09-13", data);
      assert.equal(r.giorni.length, 7);
    }
  });

  it("non conta oggi fra i giorni conclusi", () => {
    const r = costruisciRiepilogo(
      [
        giorno("2026-09-07", 1900),
        giorno("2026-09-08", 1800),
        giorno("2026-09-09", 900),
      ],
      [],
      "2026-09-09",
      "2026-09-09"
    );
    assert.equal(r.conclusi, 2, "lunedì e martedì");
    assert.equal(r.registrati, 2);
    // la media è 1850, non 1533: oggi è mezza giornata e resta fuori
    assert.equal(r.medie?.kcal, 1850);
  });

  it("i giorni non ancora arrivati non abbassano niente", () => {
    const r = costruisciRiepilogo(
      [giorno("2026-09-07", 1900)],
      [],
      "2026-09-08",
      "2026-09-08"
    );
    assert.equal(r.conclusi, 1);
    assert.equal(r.medie?.kcal, 1900);
  });

  it("un giorno concluso ma vuoto conta nei conclusi, non nei registrati", () => {
    const r = costruisciRiepilogo(
      [giorno("2026-09-07", 1900)],
      [],
      "2026-09-09",
      "2026-09-09"
    );
    assert.equal(r.conclusi, 2);
    assert.equal(r.registrati, 1);
    assert.equal(r.medie?.kcal, 1900, "il giorno vuoto non dimezza la media");
  });

  it("senza nessun giorno concluso non inventa una media", () => {
    const r = costruisciRiepilogo(
      [giorno("2026-09-07", 900)],
      [],
      "2026-09-07",
      "2026-09-07"
    );
    assert.equal(r.medie, null);
  });

  it("tiene solo le sedute della settimana", () => {
    const r = costruisciRiepilogo([], SEDUTE, "2026-09-09", "2026-09-09");
    assert.deepEqual(
      r.sedute.map((s) => s.day),
      ["2026-09-08", "2026-09-10"]
    );
    assert.equal(r.volumeTotale, 4548 + 3910);
  });

  it("sa se la settimana è finita", () => {
    assert.equal(
      costruisciRiepilogo([], [], "2026-09-07", "2026-09-09").inCorso,
      true
    );
    assert.equal(
      costruisciRiepilogo([], [], "2026-09-07", "2026-09-14").inCorso,
      false
    );
  });
});

describe("riepilogoTesto", () => {
  const completo = costruisciRiepilogo(
    [
      giorno("2026-09-07", 1900),
      giorno("2026-09-08", 1800),
      giorno("2026-09-10", 2000),
      giorno("2026-09-11", 900),
    ],
    SEDUTE,
    "2026-09-11",
    "2026-09-11"
  );
  const testo = riepilogoTesto(completo);

  it("dice di che settimana parla", () => {
    assert.match(testo, /Settimana 7 settembre – 13 settembre/);
    assert.match(testo, /settimana ancora in corso/);
  });

  it("elenca tutti e sette i giorni", () => {
    for (const nome of ["lun", "mar", "mer", "gio", "ven", "sab", "dom"]) {
      assert.match(testo, new RegExp(`^${nome} `, "m"), nome);
    }
  });

  it("distingue il giorno non registrato da quello che deve ancora arrivare", () => {
    assert.match(testo, /^mer 9\s+non registrato$/m);
    assert.match(testo, /^sab 12\s+—$/m);
    assert.match(testo, /^dom 13\s+—$/m);
  });

  it("mostra oggi ma lo dichiara in corso", () => {
    assert.match(testo, /^ven 11 .*\(in corso\)$/m);
  });

  it("dichiara su quanti giorni è fatta la media", () => {
    assert.match(testo, /Media su 3 giorni registrati su 4 conclusi/);
    // (1900 + 1800 + 2000) / 3 = 1900
    assert.match(testo, /\b1900 kcal/);
  });

  it("formatta i macro come a schermo, non con un formato tutto suo", () => {
    // formatMacro non raggruppa le migliaia: se qui comparisse "1.900" il
    // testo copiato direbbe un numero diverso dalla scheda che lo mostra
    assert.doesNotMatch(testo, /1\.9\d\d kcal/);
    // i chilogrammi invece sono raggruppati ovunque nell'app
    assert.match(testo, /4\.548 kg/);
  });

  it("riporta il target, così il numero si legge da solo", () => {
    assert.match(testo, /Target: 2050 kcal/);
  });

  it("elenca le sedute e il volume totale", () => {
    assert.match(testo, /Day 1 — Push · 24 serie · 4\.548 kg/);
    assert.match(testo, /2 sedute · 8\.458 kg sollevati in tutto/);
    assert.doesNotMatch(testo, /Full Body/, "quella è della settimana dopo");
  });

  it("avverte su come vanno letti i carichi dei manubri", () => {
    assert.match(testo, /peso di un manubrio, non il totale/);
  });

  it("i numeri li scrive come li scrive lo schermo, virgola compresa", () => {
    // Regola 11: lo stesso numero si scrive uguale dovunque esca. Il testo si
    // incolla in una chat dove chi legge non ha l'app davanti, quindi un
    // punto decimale qui e una virgola a schermo sono due numeri diversi per
    // chi guarda.
    const conDecimali = riepilogoTesto(
      costruisciRiepilogo(
        [
          {
            day: "2026-09-07",
            kcal: 1845,
            carbs: 230.6,
            protein: 155.5,
            fat: 62.5,
          },
        ],
        [],
        "2026-09-08",
        "2026-09-08"
      ),
      { kcal: 1905, carbs: 220.5, protein: 155, fat: 45 }
    );
    assert.match(conDecimali, /C 230,6/);
    assert.match(conDecimali, /G 62,5/);
    assert.match(conDecimali, /Target: 1905 kcal · C 220,5/);
    assert.doesNotMatch(
      conDecimali,
      /\d\.\d/,
      "un punto fra due cifre vuol dire che un numero è uscito alla maniera inglese"
    );
  });

  it("senza dati non finge: lo scrive", () => {
    const vuoto = riepilogoTesto(
      costruisciRiepilogo([], [], "2026-09-07", "2026-09-07")
    );
    assert.match(vuoto, /non c'è una media da fare/);
    assert.match(vuoto, /Nessuna seduta registrata/);
    assert.doesNotMatch(
      vuoto,
      /\b0 kcal\b/,
      "un giorno vuoto non è zero calorie"
    );
  });
});

describe("le note delle sedute nel testo copiabile", () => {
  const conNota = costruisciRiepilogo(
    [],
    [
      {
        day: "2026-09-08",
        label: "Day 1",
        focus: "Petto",
        volume: 2400,
        setCount: 12,
        note: "Spalla destra che tira sulle spinte",
      },
      {
        day: "2026-09-10",
        label: "Day 2",
        focus: "Schiena",
        volume: 3100,
        setCount: 14,
      },
    ],
    "2026-09-11",
    "2026-09-11"
  );

  it("la nota finisce nel testo che si manda al personal trainer", () => {
    assert.match(riepilogoTesto(conNota), /Spalla destra che tira/);
  });

  it("sta sotto la riga dei numeri, non al posto suo", () => {
    const righe = riepilogoTesto(conNota).split("\n");
    const indiceSeduta = righe.findIndex((r) => /Day 1/.test(r));
    assert.ok(indiceSeduta >= 0);
    assert.match(righe[indiceSeduta], /12 serie/);
    assert.match(righe[indiceSeduta + 1], /Spalla destra/);
  });

  it("una seduta senza nota non aggiunge una riga vuota", () => {
    const righe = riepilogoTesto(conNota).split("\n");
    const indice = righe.findIndex((r) => /Day 2/.test(r));
    assert.ok(indice >= 0);
    assert.doesNotMatch(righe[indice + 1] ?? "", /^\s+\S/);
  });
});

describe("le calorie registrate a occhio nel riepilogo", () => {
  const conAOcchio = costruisciRiepilogo(
    [
      {
        day: "2026-09-07",
        kcal: 1900,
        carbs: 210,
        protein: 150,
        fat: 50,
        kcalNonScomposte: 0,
      },
      {
        day: "2026-09-08",
        kcal: 1600,
        carbs: 120,
        protein: 90,
        fat: 30,
        kcalNonScomposte: 450,
      },
    ],
    [],
    "2026-09-11",
    "2026-09-11"
  );

  it("le somma sui giorni della settimana", () => {
    assert.equal(conAOcchio.kcalNonScomposte, 450);
  });

  it("il testo lo dice a chi legge, che l'app non ce l'ha davanti", () => {
    const testo = riepilogoTesto(conAOcchio);
    assert.match(testo, /450 kcal/);
    assert.match(testo, /senza macro/);
  });

  it("lo dice una volta sola, non su ogni giorno", () => {
    const occorrenze = riepilogoTesto(conAOcchio).match(/senza macro/g) ?? [];
    assert.equal(occorrenze.length, 1);
  });

  it("se è tutto scomposto non aggiunge niente", () => {
    const pulito = costruisciRiepilogo(
      [{ day: "2026-09-07", kcal: 1900, carbs: 210, protein: 150, fat: 50 }],
      [],
      "2026-09-11",
      "2026-09-11"
    );
    assert.equal(pulito.kcalNonScomposte, 0);
    assert.doesNotMatch(riepilogoTesto(pulito), /senza macro/);
  });
});

describe("il numero della settimana", () => {
  it("è null senza una prima settimana da cui contare", () => {
    assert.equal(numeroSettimana("2026-09-07", null), null);
  });

  it("la prima settimana registrata è la settimana 1", () => {
    assert.equal(numeroSettimana("2026-09-07", "2026-09-07"), 1);
  });

  it("conta le settimane intere passate", () => {
    // 2026-09-07 è lunedì; tre settimane dopo è il 2026-09-28.
    assert.equal(numeroSettimana("2026-09-28", "2026-09-07"), 4);
  });

  it("costruisciRiepilogo la calcola dal primo giorno mai registrato", () => {
    const r = costruisciRiepilogo(
      [],
      [],
      "2026-09-14",
      "2026-09-14",
      // primo giorno registrato di mercoledì: la settimana 1 parte comunque
      // dal lunedì di quella settimana, non dal mercoledì stesso.
      "2026-09-09"
    );
    assert.equal(r.numeroSettimana, 2);
  });

  it("senza un primo giorno resta null, e riepilogoTesto non lo scrive", () => {
    const r = costruisciRiepilogo([], [], "2026-09-07", "2026-09-07");
    assert.equal(r.numeroSettimana, null);
    assert.match(riepilogoTesto(r), /^Settimana 7 settembre – 13 settembre/);
  });

  it("con un primo giorno, riepilogoTesto scrive il numero", () => {
    const r = costruisciRiepilogo(
      [],
      [],
      "2026-09-07",
      "2026-09-07",
      "2026-09-07"
    );
    assert.equal(r.numeroSettimana, 1);
    assert.match(
      riepilogoTesto(r),
      /^Settimana 1 · 7 settembre – 13 settembre/
    );
  });
});

describe("la nota sulla dieta", () => {
  it("è null quando non c'è una nota salvata", () => {
    const r = costruisciRiepilogo([], [], "2026-09-07", "2026-09-07");
    assert.equal(r.notaDieta, null);
    assert.doesNotMatch(riepilogoTesto(r), /DIETA/);
  });

  it("finisce nel testo copiato, sotto la sua etichetta", () => {
    const r = costruisciRiepilogo(
      [],
      [],
      "2026-09-07",
      "2026-09-07",
      null,
      "fame giovedì, sgarro sabato sera"
    );
    assert.equal(r.notaDieta, "fame giovedì, sgarro sabato sera");
    assert.match(
      riepilogoTesto(r),
      /DIETA\nfame giovedì, sgarro sabato sera/
    );
  });
});

describe("il peso della settimana", () => {
  const oggi = "2026-09-11"; // dentro la settimana 7-13 settembre

  it("null per entrambe senza righe di peso", () => {
    const r = costruisciRiepilogo([], [], oggi, oggi);
    assert.equal(r.pesoSettimana, null);
    assert.equal(r.pesoSettimanaScorsa, null);
    assert.doesNotMatch(riepilogoTesto(r), /Peso/);
  });

  it("prende l'ultima misura di questa settimana e di quella precedente", () => {
    const pesi = [
      { day: "2026-08-31", weightKg: 84 }, // settimana precedente (31 ago - 6 set)
      { day: "2026-09-02", weightKg: 83.2 }, // settimana precedente, piu' recente
      { day: "2026-09-08", weightKg: 82.7 }, // questa settimana
      { day: "2026-09-10", weightKg: 82.5 }, // questa settimana, piu' recente
    ];
    const r = costruisciRiepilogo([], [], oggi, oggi, null, null, pesi);
    assert.equal(r.pesoSettimana, 82.5);
    assert.equal(r.pesoSettimanaScorsa, 83.2);
    assert.match(riepilogoTesto(r), /Peso: 82,5 kg \(83,2 kg la settimana scorsa\)/);
  });

  it("solo questa settimana: niente confronto inventato", () => {
    const pesi = [{ day: "2026-09-09", weightKg: 82 }];
    const r = costruisciRiepilogo([], [], oggi, oggi, null, null, pesi);
    assert.equal(r.pesoSettimana, 82);
    assert.equal(r.pesoSettimanaScorsa, null);
    assert.match(riepilogoTesto(r), /^Peso: 82 kg$/m);
  });

  it("solo la settimana scorsa: lo dice, non tace e non inventa quella corrente", () => {
    const pesi = [{ day: "2026-09-01", weightKg: 84 }];
    const r = costruisciRiepilogo([], [], oggi, oggi, null, null, pesi);
    assert.equal(r.pesoSettimana, null);
    assert.equal(r.pesoSettimanaScorsa, 84);
    assert.match(riepilogoTesto(r), /Peso la settimana scorsa: 84 kg/);
  });
});
