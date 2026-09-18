import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizzaProdottiOFF, scalaProdotto } from "./openfoodfacts";

function prodottoGrezzo(patch: Record<string, unknown> = {}) {
  return {
    product_name: "Pane integrale",
    brands: "Mulino Bianco",
    nutriments: {
      "energy-kcal_100g": 250,
      carbohydrates_100g: 45,
      proteins_100g: 9,
      fat_100g: 2,
    },
    ...patch,
  };
}

describe("normalizzaProdottiOFF", () => {
  it("converte una risposta ben formata", () => {
    const prodotti = normalizzaProdottiOFF({ products: [prodottoGrezzo()] });
    assert.equal(prodotti.length, 1);
    assert.deepEqual(prodotti[0], {
      nome: "Pane integrale",
      marca: "Mulino Bianco",
      kcalPer100g: 250,
      carbsPer100g: 45,
      proteinPer100g: 9,
      fatPer100g: 2,
      completo: true,
    });
  });

  it("scarta i prodotti senza nome", () => {
    const prodotti = normalizzaProdottiOFF({
      products: [prodottoGrezzo({ product_name: "   " }), prodottoGrezzo()],
    });
    assert.equal(prodotti.length, 1);
  });

  it("scarta i prodotti senza calorie: non c'è niente da mostrare", () => {
    const prodotti = normalizzaProdottiOFF({
      products: [
        prodottoGrezzo({
          nutriments: { carbohydrates_100g: 45, proteins_100g: 9, fat_100g: 2 },
        }),
      ],
    });
    assert.equal(prodotti.length, 0);
  });

  it("segna incompleto un prodotto a cui manca un macro, invece di scartarlo", () => {
    const prodotti = normalizzaProdottiOFF({
      products: [
        prodottoGrezzo({
          nutriments: { "energy-kcal_100g": 250, carbohydrates_100g: 45 },
        }),
      ],
    });
    assert.equal(prodotti.length, 1);
    assert.equal(prodotti[0].completo, false);
    // I macro mancanti restano leggibili come zero, non come "non lo so":
    // la dichiarazione dell'incompletezza sta nel flag, non nel numero.
    assert.equal(prodotti[0].proteinPer100g, 0);
    assert.equal(prodotti[0].fatPer100g, 0);
  });

  it("scarta i numeri impossibili invece di salvarli", () => {
    const casi = [
      prodottoGrezzo({ nutriments: { "energy-kcal_100g": -5 } }),
      prodottoGrezzo({ nutriments: { "energy-kcal_100g": 40000 } }),
      prodottoGrezzo({
        nutriments: { "energy-kcal_100g": 250, carbohydrates_100g: "tanti" },
      }),
      prodottoGrezzo({
        nutriments: { "energy-kcal_100g": 250, proteins_100g: Number.NaN },
      }),
      prodottoGrezzo({
        nutriments: { "energy-kcal_100g": 250, fat_100g: 500 },
      }),
    ];
    for (const caso of casi) {
      const prodotti = normalizzaProdottiOFF({ products: [caso] });
      // O il prodotto non passa (kcal invalide), o passa ma il macro fuori
      // scala è finito a "non lo so" (incompleto), mai scritto com'è arrivato.
      if (prodotti.length > 0) {
        assert.equal(
          prodotti[0].completo,
          false,
          `non doveva essere completo: ${JSON.stringify(caso)}`,
        );
      }
    }
  });

  it("accetta uno zero, che è un valore vero", () => {
    const prodotti = normalizzaProdottiOFF({
      products: [
        prodottoGrezzo({
          product_name: "Acqua",
          nutriments: {
            "energy-kcal_100g": 0,
            carbohydrates_100g: 0,
            proteins_100g: 0,
            fat_100g: 0,
          },
        }),
      ],
    });
    assert.equal(prodotti.length, 1);
    assert.equal(prodotti[0].kcalPer100g, 0);
    assert.equal(prodotti[0].completo, true);
  });

  it("taglia il nome e la marca ai limiti che il salvataggio accetta", () => {
    const prodotti = normalizzaProdottiOFF({
      products: [
        prodottoGrezzo({
          product_name: "a".repeat(300),
          brands: "b".repeat(300),
        }),
      ],
    });
    assert.equal(prodotti[0].nome.length, 120);
    assert.equal(prodotti[0].marca.length, 80);
  });

  it("tiene solo la prima marca quando ce ne sono elencate diverse", () => {
    const prodotti = normalizzaProdottiOFF({
      products: [prodottoGrezzo({ brands: "Mulino Bianco,Barilla" })],
    });
    assert.equal(prodotti[0].marca, "Mulino Bianco");
  });

  it("non si fa dare in pasto duecento risultati", () => {
    const prodotti = normalizzaProdottiOFF({
      products: Array.from({ length: 200 }, () => prodottoGrezzo()),
    });
    assert.equal(prodotti.length, 20);
  });

  it("regge una risposta che non è quella attesa", () => {
    for (const raw of [
      null,
      undefined,
      42,
      "ciao",
      [],
      {},
      { products: "no" },
    ]) {
      assert.deepEqual(normalizzaProdottiOFF(raw), []);
    }
  });

  it("scarta le voci dell'elenco che non sono oggetti", () => {
    const prodotti = normalizzaProdottiOFF({
      products: [null, 42, "ciao", prodottoGrezzo()],
    });
    assert.equal(prodotti.length, 1);
  });
});

describe("scalaProdotto", () => {
  const prodotto = {
    nome: "Pane integrale",
    marca: "Mulino Bianco",
    kcalPer100g: 250,
    carbsPer100g: 45,
    proteinPer100g: 9,
    fatPer100g: 2,
    completo: true,
  };

  it("a 100 g restituisce gli stessi valori per 100 g", () => {
    assert.deepEqual(scalaProdotto(prodotto, 100), {
      kcal: 250,
      carbs: 45,
      protein: 9,
      fat: 2,
    });
  });

  it("scala in proporzione ai grammi", () => {
    assert.deepEqual(scalaProdotto(prodotto, 50), {
      kcal: 125,
      carbs: 22.5,
      protein: 4.5,
      fat: 1,
    });
  });

  it("a zero grammi restituisce zero", () => {
    assert.deepEqual(scalaProdotto(prodotto, 0), {
      kcal: 0,
      carbs: 0,
      protein: 0,
      fat: 0,
    });
  });
});
