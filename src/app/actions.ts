"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, supplementChecks, waterDays, weightDays } from "@/db/schema";
import { MAX_BICCHIERI } from "@/lib/acqua";
import { isIsoDate } from "@/lib/date";
import { isMealSlot, type MealSlot } from "@/lib/meal-slots";
import {
  barcodeValido,
  normalizzaProdottiOFF,
  normalizzaProdottoDaBarcode,
  type ProdottoOFF,
} from "@/lib/openfoodfacts";
import { MAX_PESO_KG, MIN_PESO_KG } from "@/lib/peso";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type MealInput = {
  day: string;
  slot: MealSlot;
  name: string;
  quantity: number;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  /** Le calorie si sanno, i macro no. Vedi `meals.onlyKcal` nello schema. */
  onlyKcal?: boolean;
  /**
   * Generato dal telefono, per poter riprovare senza scrivere doppioni.
   * Vedi `meals.clientId` nello schema.
   */
  clientId?: string;
};

function validate(input: MealInput): string | null {
  if (!isIsoDate(input.day)) return "Data non valida.";
  if (!isMealSlot(input.slot)) return "Momento della giornata non valido.";
  if (
    !Number.isFinite(input.quantity) ||
    input.quantity <= 0 ||
    input.quantity > 20
  ) {
    return "La quantità deve stare fra 0 e 20 porzioni.";
  }
  if (!input.name.trim()) return "Il nome del pasto è obbligatorio.";
  if (input.name.trim().length > 120)
    return "Il nome del pasto è troppo lungo.";

  const numbers: [string, number][] = [
    ["kcal", input.kcal],
    ["carboidrati", input.carbs],
    ["proteine", input.protein],
    ["grassi", input.fat],
  ];
  for (const [label, value] of numbers) {
    if (!Number.isFinite(value) || value < 0) {
      return `Valore non valido per ${label}.`;
    }
  }
  return null;
}

export async function addMeal(input: MealInput): Promise<ActionResult> {
  const error = validate(input);
  if (error) return { ok: false, error };

  try {
    /*
     * `onConflictDoNothing` sull'identificativo del telefono.
     *
     * Serve al caso peggiore: la rete cade *dopo* che il server ha scritto ma
     * prima che la risposta torni indietro. Il telefono crede di aver
     * fallito, mette il pasto in coda e riprova -- e senza questo il pranzo
     * finirebbe in doppia copia. La rete di sicurezza creerebbe il problema
     * che dovrebbe risolvere.
     *
     * Senza `clientId` (un salvataggio normale, o una riga di prima che la
     * colonna esistesse) non c'e' niente su cui il conflitto possa scattare:
     * Postgres tratta ogni NULL come diverso dagli altri.
     */
    await db
      .insert(meals)
      .values({
        day: input.day,
        slot: input.slot,
        name: input.name.trim(),
        quantity: input.quantity,
        kcal: Math.round(input.kcal),
        carbs: input.carbs,
        protein: input.protein,
        fat: input.fat,
        onlyKcal: input.onlyKcal ?? false,
        clientId: input.clientId ?? null,
      })
      .onConflictDoNothing({ target: meals.clientId });
  } catch (cause) {
    console.error("addMeal fallita", cause);
    return { ok: false, error: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Reinserisce un pasto appena eliminato mantenendone l'orario originale,
 * cosi' dopo un "Annulla" torna al suo posto nella lista e non in fondo.
 */
export async function restoreMeal(
  input: MealInput & { createdAt: string }
): Promise<ActionResult> {
  const error = validate(input);
  if (error) return { ok: false, error };

  const createdAt = new Date(input.createdAt);
  if (Number.isNaN(createdAt.getTime()))
    return { ok: false, error: "Orario non valido." };

  try {
    await db.insert(meals).values({
      day: input.day,
      slot: input.slot,
      name: input.name.trim(),
      quantity: input.quantity,
      kcal: Math.round(input.kcal),
      carbs: input.carbs,
      protein: input.protein,
      fat: input.fat,
      createdAt,
    });
  } catch (cause) {
    console.error("restoreMeal fallita", cause);
    return { ok: false, error: "Ripristino non riuscito." };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Cosa si puo' correggere di un pasto gia' inserito: tutto.
 *
 * Prima si potevano cambiare solo quantita' e momento, e i macro venivano
 * riscalati dal server. Bastava finche' i numeri arrivavano dai tasti
 * rapidi, dove sono letti sulla confezione. Da quando arrivano anche da una
 * stima incollata da una chat non basta piu': se la stima e' sbagliata di
 * trenta calorie, riscalare la quantita' non la aggiusta -- sposta
 * l'errore.
 *
 * I valori arrivano assoluti, gia' come vanno scritti. Il riscalamento per
 * quantita' lo fa il foglio, dove si vede mentre lo fai: qui si scrive
 * quello che hai davanti agli occhi, e non c'e' un secondo calcolo che
 * potrebbe non essere d'accordo col primo.
 */
export type MealPatch = {
  name: string;
  quantity: number;
  slot: MealSlot;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

/** Almeno un macro diverso da zero: il pasto e' stato scomposto. */
function macroScritti(patch: {
  carbs: number;
  protein: number;
  fat: number;
}): boolean {
  return patch.carbs > 0 || patch.protein > 0 || patch.fat > 0;
}

export async function updateMeal(
  id: number,
  day: string,
  patch: MealPatch
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0)
    return { ok: false, error: "Pasto non valido." };

  const error = validate({ day, ...patch });
  if (error) return { ok: false, error };

  try {
    const aggiornate = await db
      .update(meals)
      .set({
        name: patch.name.trim(),
        quantity: patch.quantity,
        slot: patch.slot,
        kcal: Math.round(patch.kcal),
        carbs: patch.carbs,
        protein: patch.protein,
        fat: patch.fat,
        // Se correggendolo hai scritto dei macro, quel pasto non e' piu' "a
        // occhio": smettere di dichiararlo e' parte della correzione. Senza
        // questa riga l'app continuerebbe a dire che quelle calorie non sono
        // scomposte mentre i grammi sono li' a schermo.
        //
        // Al contrario non si riaccende mai da qui: un pasto normale con tre
        // zeri resta un pasto normale con tre zeri, e indovinare il contrario
        // vorrebbe dire decidere al posto tuo cosa sai e cosa non sai.
        ...(macroScritti(patch) ? { onlyKcal: false } : {}),
      })
      .where(and(eq(meals.id, id), eq(meals.day, day)))
      .returning({ id: meals.id });

    if (aggiornate.length === 0)
      return { ok: false, error: "Pasto non trovato." };
  } catch (cause) {
    console.error("updateMeal fallita", cause);
    return { ok: false, error: "Modifica non riuscita. Riprova." };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function deleteMeal(
  id: number,
  day: string
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0)
    return { ok: false, error: "Pasto non valido." };
  if (!isIsoDate(day)) return { ok: false, error: "Data non valida." };

  try {
    await db.delete(meals).where(and(eq(meals.id, id), eq(meals.day, day)));
  } catch (cause) {
    console.error("deleteMeal fallita", cause);
    return { ok: false, error: "Eliminazione non riuscita. Riprova." };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Quanti bicchieri d'acqua hai bevuto oggi.
 *
 * Si manda il totale, non "uno in piu'". Sembra un dettaglio e non lo e': su
 * rete lenta si tocca due volte, e un "aggiungi uno" ripetuto conterebbe due
 * bicchieri per un tocco solo. Col totale il secondo invio scrive lo stesso
 * numero del primo, e non succede niente -- la stessa ragione per cui le
 * serie in palestra portano un identificativo.
 *
 * Non serve un annullamento: il "meno" e' gia' l'inverso esatto del "piu'",
 * a un tocco di distanza. La regola 4 chiede che un errore si possa
 * disfare, non che ci sia per forza un messaggio che lo propone.
 */
export async function setWater(
  day: string,
  bicchieri: number
): Promise<ActionResult> {
  if (!isIsoDate(day)) return { ok: false, error: "Data non valida." };
  if (
    !Number.isInteger(bicchieri) ||
    bicchieri < 0 ||
    bicchieri > MAX_BICCHIERI
  ) {
    return {
      ok: false,
      error: `I bicchieri devono stare fra 0 e ${MAX_BICCHIERI}.`,
    };
  }

  try {
    await db
      .insert(waterDays)
      .values({ day, glasses: bicchieri, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: waterDays.day,
        set: { glasses: bicchieri, updatedAt: new Date() },
      });
  } catch (cause) {
    console.error("setWater fallita", cause);
    return { ok: false, error: "Non sono riuscito a segnarlo. Riprova." };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Scrive (o cancella) il peso di un giorno.
 *
 * `kg` nullo cancella la riga: e' cosi' che si corregge chi si pesa e poi
 * ripensa il numero, senza lasciare una riga a zero che il grafico
 * leggerebbe come un peso vero (regola 6).
 */
export async function setPeso(
  day: string,
  kg: number | null
): Promise<ActionResult> {
  if (!isIsoDate(day)) return { ok: false, error: "Data non valida." };

  if (kg === null) {
    try {
      await db.delete(weightDays).where(eq(weightDays.day, day));
    } catch (cause) {
      console.error("setPeso (cancellazione) fallita", cause);
      return { ok: false, error: "Non sono riuscito a cancellarlo. Riprova." };
    }
    revalidatePath("/");
    revalidatePath("/storico");
    return { ok: true };
  }

  if (!Number.isFinite(kg) || kg < MIN_PESO_KG || kg > MAX_PESO_KG) {
    return {
      ok: false,
      error: `Il peso deve stare fra ${MIN_PESO_KG} e ${MAX_PESO_KG} kg.`,
    };
  }

  try {
    await db
      .insert(weightDays)
      .values({ day, weightKg: kg, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: weightDays.day,
        set: { weightKg: kg, updatedAt: new Date() },
      });
  } catch (cause) {
    console.error("setPeso fallita", cause);
    return { ok: false, error: "Non sono riuscito a segnarlo. Riprova." };
  }

  revalidatePath("/");
  revalidatePath("/storico");
  return { ok: true };
}

/**
 * Segna o toglie la spunta di un integratore, per un giorno.
 *
 * Non c'e' una colonna "preso": la riga esiste se l'hai preso e non esiste se
 * non l'hai preso. Togliere la spunta e' una DELETE, ed e' anche
 * l'annullamento -- l'inverso esatto del tocco che l'ha messa, a un tocco di
 * distanza. Per questo non c'e' nessun messaggio che propone di disfare.
 *
 * `preso` arriva dal client come stato voluto, non come "inverti": due tocchi
 * rapidi sulla stessa riga devono finire dove dice l'ultimo, non dove li
 * porta il conteggio.
 */
export async function segnaIntegratore(
  day: string,
  supplementId: number,
  preso: boolean
): Promise<ActionResult> {
  if (!isIsoDate(day)) return { ok: false, error: "Data non valida." };
  if (!Number.isInteger(supplementId) || supplementId <= 0) {
    return { ok: false, error: "Integratore non valido." };
  }

  try {
    if (preso) {
      await db
        .insert(supplementChecks)
        .values({ day, supplementId })
        // Gia' spuntato: e' quello che volevi, non un errore da mostrare.
        .onConflictDoNothing();
    } else {
      await db
        .delete(supplementChecks)
        .where(
          and(
            eq(supplementChecks.day, day),
            eq(supplementChecks.supplementId, supplementId)
          )
        );
    }
  } catch (cause) {
    console.error("segnaIntegratore fallita", cause);
    return { ok: false, error: "Non sono riuscito a segnarlo. Riprova." };
  }

  revalidatePath("/");
  return { ok: true };
}

const RICERCA_TIMEOUT_MS = 6000;
const MAX_RICERCA = 60;

/** Open Food Facts lo chiede esplicitamente nella sua documentazione: dice chi sta chiamando. */
const OFF_USER_AGENT =
  "PersonalTrainer/1.0 (app personale; github.com/TheRealMogu/PersonalTrainer)";

export type RicercaProdottiResult =
  | { ok: true; prodotti: ProdottoOFF[] }
  | { ok: false; error: string };

/**
 * Cerca un prodotto per nome su Open Food Facts.
 *
 * È la prima chiamata a un servizio esterno di questo repo (vedi
 * ROADMAP.md, sezione 6-sexies). Parte dal server e non dal telefono: così
 * non espone niente all'esterno, e in futuro si può mettere in cache una
 * ricerca già fatta senza toccare il client.
 *
 * Quello che torna è un elenco di proposte, non una scrittura: la schermata
 * fa scegliere il prodotto e i grammi, mostra i macro calcolati e chiede
 * conferma prima di passarli ad `addMeal` — la stessa porta unica di
 * `normalizzaStima` per "Incolla da Claude" (regola 12).
 */
export async function cercaProdotto(
  query: string
): Promise<RicercaProdottiResult> {
  const pulita = query.trim().slice(0, MAX_RICERCA);
  if (!pulita) return { ok: false, error: "Scrivi almeno una lettera." };

  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", pulita);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "20");
  url.searchParams.set("fields", "product_name,brands,nutriments");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RICERCA_TIMEOUT_MS);

  try {
    const risposta = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": OFF_USER_AGENT },
    });
    if (!risposta.ok) {
      return {
        ok: false,
        error: "Open Food Facts non risponde. Riprova tra poco.",
      };
    }
    const dati: unknown = await risposta.json();
    return { ok: true, prodotti: normalizzaProdottiOFF(dati) };
  } catch (cause) {
    console.error("cercaProdotto fallita", cause);
    return {
      ok: false,
      error: "Non riesco a cercare adesso: controlla la rete e riprova.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export type CercaBarcodeResult =
  | { ok: true; prodotto: ProdottoOFF }
  | { ok: false; error: string };

/**
 * Cerca un prodotto per codice a barre su Open Food Facts.
 *
 * Serve per quando il nome non basta a distinguere due varianti dello
 * stesso prodotto (ROADMAP.md, sezione 6-sexies). Il codice si valida prima
 * di partire — otto, dodici, tredici o quattordici cifre — perché un
 * errore di battitura si vede subito, senza sprecare un giro di rete.
 *
 * Open Food Facts risponde sempre con 200 anche quando il codice non
 * corrisponde a niente (`status: 0`): non è un guasto, è un fatto legittimo,
 * quindi qui diventa lo stesso canale d'errore in italiano degli altri casi,
 * non un'eccezione.
 */
export async function cercaProdottoPerBarcode(
  barcode: string
): Promise<CercaBarcodeResult> {
  const pulito = barcode.trim();
  if (!barcodeValido(pulito)) {
    return {
      ok: false,
      error: "Il codice a barre deve avere 8, 12, 13 o 14 cifre.",
    };
  }

  const url = new URL(
    `https://world.openfoodfacts.org/api/v2/product/${pulito}.json`
  );
  url.searchParams.set("fields", "product_name,brands,nutriments,status");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RICERCA_TIMEOUT_MS);

  try {
    const risposta = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": OFF_USER_AGENT },
    });
    if (!risposta.ok) {
      return {
        ok: false,
        error: "Open Food Facts non risponde. Riprova tra poco.",
      };
    }
    const dati: unknown = await risposta.json();
    const prodotto = normalizzaProdottoDaBarcode(dati);
    if (!prodotto) {
      return {
        ok: false,
        error: "Nessun prodotto trovato per questo codice a barre.",
      };
    }
    return { ok: true, prodotto };
  } catch (cause) {
    console.error("cercaProdottoPerBarcode fallita", cause);
    return {
      ok: false,
      error: "Non riesco a cercare adesso: controlla la rete e riprova.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
