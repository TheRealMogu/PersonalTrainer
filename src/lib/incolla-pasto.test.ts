import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { QuickFood } from "@/db/schema";
import { leggiIncollato, MAX_INCOLLATO, promptPerClaude } from "./incolla-pasto";

function alimenti(testo: string, slot: "colazione" | "pranzo" | "cena" | "spuntino" = "pranzo") {
  const esito = leggiIncollato(testo, slot);
  assert.equal(esito.ok, true, `non letto: ${esito.ok ? "" : esito.error}`);
  return esito.ok ? esito.stima.alimenti : [];
}

describe("JSON, il formato che chiediamo", () => {
  it("legge la risposta nella forma del prompt", () => {
    const letti = alimenti(
      '{"alimenti":[{"nome":"Pane integrale","porzione":"80 g","momento":"colazione","kcal":194,"carboidrati":38,"proteine":7,"grassi":1.6}]}',
    );
    assert.equal(letti.length, 1);
    assert.deepEqual(letti[0], {
      nome: "Pane integrale",
      porzione: "80 g",
      slot: "colazione",
      kcal: 194,
      carbs: 38,
      protein: 7,
      fat: 1.6,
      supposta: false,
    });
  });

  it("accetta un elenco nudo, senza la busta", () => {
    const letti = alimenti('[{"nome":"Mela","kcal":78,"carboidrati":20.6,"proteine":0.4,"grassi":0.3}]');
    assert.equal(letti[0].nome, "Mela");
    assert.equal(letti[0].slot, "pranzo", "senza momento usa quello proposto");
  });

  it("sopravvive alle staccionate di codice", () => {
    const letti = alimenti('```json\n{"alimenti":[{"nome":"Mela","kcal":78,"carboidrati":20,"proteine":0,"grassi":0}]}\n```');
    assert.equal(letti[0].nome, "Mela");
  });

  it("sopravvive a una riga di cortesia prima del JSON", () => {
    const letti = alimenti(
      'Ecco il JSON:\n{"alimenti":[{"nome":"Mela","kcal":78,"carboidrati":20,"proteine":0,"grassi":0}]}\nFammi sapere!',
    );
    assert.equal(letti[0].nome, "Mela");
  });

  it("un JSON rotto non passa per buono", () => {
    const esito = leggiIncollato('{"alimenti":[{"nome":"Mela",}]}', "pranzo");
    assert.equal(esito.ok, false);
  });
});

describe("tabella markdown, quello che esce se non chiedi il JSON", () => {
  const tabella = `Ecco cosa hai mangiato:

| Alimento | Porzione | Momento | kcal | C (g) | P (g) | G (g) |
|---|---|---|---|---|---|---|
| Uova strapazzate | 2 uova | colazione | 182 | 1.2 | 13 | 13.6 |
| Pane integrale | 80 g | colazione | 194 | 38 | 7 | 1,6 |`;

  it("legge righe e colonne", () => {
    const letti = alimenti(tabella);
    assert.equal(letti.length, 2);
    assert.equal(letti[0].nome, "Uova strapazzate");
    assert.equal(letti[0].porzione, "2 uova");
    assert.equal(letti[0].slot, "colazione");
    assert.equal(letti[1].fat, 1.6, "la virgola decimale vale come il punto");
  });

  it("non scambia la riga di trattini per un alimento", () => {
    assert.equal(alimenti(tabella).length, 2);
  });

  it("regge le intestazioni per esteso e il grassetto", () => {
    const letti = alimenti(`| Nome | Calorie | Carboidrati | Proteine | Grassi |
|---|---|---|---|---|
| **Mela** | 78 kcal | 20,6 | 0,4 | 0,3 |`);
    assert.equal(letti[0].nome, "Mela", "il grassetto non entra nel nome");
    assert.equal(letti[0].kcal, 78);
    assert.equal(letti[0].carbs, 20.6);
  });

  it("una tabella che non parla di cibo non viene letta come tale", () => {
    const esito = leggiIncollato("| Giorno | Peso |\n|---|---|\n| lunedì | 78 |", "pranzo");
    assert.equal(esito.ok, false);
  });
});

describe("righe scritte a mano", () => {
  it("legge il formato con le parentesi e le sigle", () => {
    const letti = alimenti("Pane integrale (80 g): 194 kcal, C 38, P 7, G 1,6");
    assert.deepEqual(
      { ...letti[0] },
      {
        nome: "Pane integrale",
        porzione: "80 g",
        slot: "pranzo",
        kcal: 194,
        carbs: 38,
        protein: 7,
        fat: 1.6,
        supposta: false,
      },
    );
  });

  it("legge un elenco puntato", () => {
    const letti = alimenti(`- Mela: 78 kcal, C 20,6, P 0,4, G 0,3
- Yogurt greco: 96 kcal, C 5,7, P 17, G 0,4`);
    assert.equal(letti.length, 2);
    assert.equal(letti[1].protein, 17);
  });

  it("legge i macro scritti per esteso, anche rovesciati", () => {
    const letti = alimenti("Petto di pollo: 165 kcal, proteine 31 g, grassi 3,6 g, carboidrati 0 g");
    assert.equal(letti[0].protein, 31);
    assert.equal(letti[0].fat, 3.6);
    assert.equal(letti[0].carbs, 0);
  });

  it("raccoglie il momento se e' scritto nella riga, e non nel nome", () => {
    const letti = alimenti("Cena: risotto 520 kcal, C 70, P 12, G 18");
    assert.equal(letti[0].slot, "cena");
    assert.equal(letti[0].nome, "risotto");
  });

  it("non scambia la 'p' di porzione per le proteine", () => {
    const letti = alimenti("Insalata, porzione: 220 kcal, C 10, P 6, G 15");
    assert.equal(letti[0].protein, 6);
  });

  it("salta le righe senza calorie invece di inventarle", () => {
    const letti = alimenti(`Oggi ho mangiato bene.
Mela: 78 kcal, C 20, P 0, G 0
Domani vediamo.`);
    assert.equal(letti.length, 1);
  });

  it("i macro mancanti valgono zero, non undefined", () => {
    const letti = alimenti("Caffè: 2 kcal");
    assert.equal(letti[0].carbs, 0);
    assert.equal(letti[0].protein, 0);
    assert.equal(letti[0].fat, 0);
  });
});

describe("quando non si capisce, lo si dice", () => {
  it("testo vuoto", () => {
    const esito = leggiIncollato("   \n  ", "pranzo");
    assert.equal(esito.ok, false);
    assert.match(esito.ok ? "" : esito.error, /Non hai incollato niente/);
  });

  it("testo che non contiene numeri", () => {
    const esito = leggiIncollato("ciao come stai", "pranzo");
    assert.equal(esito.ok, false);
    assert.match(esito.ok ? "" : esito.error, /formato/);
  });

  it("testo oltre il tetto", () => {
    const esito = leggiIncollato("a".repeat(MAX_INCOLLATO + 1), "pranzo");
    assert.equal(esito.ok, false);
    assert.match(esito.ok ? "" : esito.error, /troppo lungo/);
  });

  it("un JSON con alimenti vuoti non è una lettura riuscita", () => {
    const esito = leggiIncollato('{"alimenti":[]}', "pranzo");
    assert.equal(esito.ok, false);
  });

  it("i numeri impossibili vengono scartati, non salvati", () => {
    const esito = leggiIncollato(
      '{"alimenti":[{"nome":"Sbagliato","kcal":-5,"carboidrati":0,"proteine":0,"grassi":0}]}',
      "pranzo",
    );
    assert.equal(esito.ok, false);
  });
});

describe("il prompt da dare a Claude", () => {
  const foods: QuickFood[] = [
    { id: 1, name: "Fette biscottate", portion: "2 pezzi", kcal: 70, carbs: 13, protein: 2, fat: 1, sortOrder: 0 },
  ];

  it("chiede esattamente i campi che sappiamo leggere", () => {
    const prompt = promptPerClaude([]);
    for (const campo of ["nome", "porzione", "momento", "kcal", "carboidrati", "proteine", "grassi"]) {
      assert.match(prompt, new RegExp(`"${campo}"`));
    }
  });

  /*
   * Le foto sono il caso vero: si fotografa l'etichetta e si manda. Senza
   * dirglielo, un modello stima lo stesso invece di leggere i numeri che ha
   * gia' davanti -- e una stima al posto di un dato e' esattamente quello
   * che la regola 5 vieta.
   */
  it("dice cosa fare con le foto, che sono il caso vero", () => {
    const prompt = promptPerClaude([]);
    assert.match(prompt, /foto di un'etichetta/);
    assert.match(prompt, /tabella nutrizionale/);
    assert.match(prompt, /foto di un piatto/);
  });

  it("porta con sé i valori già in archivio, così non vengono ristimati", () => {
    assert.match(promptPerClaude(foods), /Fette biscottate \(2 pezzi\): 70 kcal/);
    assert.doesNotMatch(promptPerClaude([]), /già in archivio/);
  });

  /*
   * La prova che conta: lo scheletro che diamo a Claude e il lettore devono
   * restare d'accordo. Se qualcuno cambia un nome di campo da una parte
   * sola, e' qui che si rompe -- non sul telefono, con la cena davanti.
   */
  it("quello che il prompt descrive è leggibile davvero", () => {
    const scheletro = promptPerClaude(foods).match(/\{"alimenti".*\}/);
    assert.ok(scheletro, "il prompt deve contenere lo scheletro JSON");
    const esempio = scheletro[0]
      .replace('"nome":""', '"nome":"Mela"')
      .replace('"porzione":""', '"porzione":"1 media"')
      .replace('"momento":"colazione|pranzo|cena|spuntino"', '"momento":"spuntino"')
      .replace('"kcal":0', '"kcal":78')
      .replace('"carboidrati":0', '"carboidrati":20.6');
    const letti = alimenti(esempio);
    assert.equal(letti[0].nome, "Mela");
    assert.equal(letti[0].porzione, "1 media");
    assert.equal(letti[0].slot, "spuntino");
    assert.equal(letti[0].kcal, 78);
    assert.equal(letti[0].carbs, 20.6);
  });
});
