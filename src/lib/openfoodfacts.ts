/**
 * Un prodotto letto da Open Food Facts, con i valori per 100 g.
 *
 * Restano "per 100 g" finché non si scelgono i grammi da mangiare: è
 * l'unità in cui Open Food Facts pubblica i dati, e riscalare due volte
 * (una qui, una nel foglio dei grammi) sarebbe un'occasione in più di
 * sbagliare un arrotondamento.
 */
export type ProdottoOFF = {
  nome: string;
  marca: string;
  kcalPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  /** Falso quando Open Food Facts non aveva tutti e quattro i valori. */
  completo: boolean;
};

const MAX_RISULTATI = 20;
const MAX_NOME = 120;
const MAX_MARCA = 80;
/** L'olio puro sta a 884 kcal/100g: il tetto lascia margine senza aprire a un errore. */
const MAX_KCAL_100G = 950;
/** Un macro non può pesare più del prodotto intero. */
const MAX_MACRO_100G = 100;

function numero(value: unknown, massimo: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return null;
  if (value > massimo) return null;
  return value;
}

function testo(value: unknown, massimo: number): string {
  return typeof value === "string" ? value.trim().slice(0, massimo) : "";
}

/**
 * Legge un singolo prodotto grezzo di Open Food Facts, o null se non è
 * utilizzabile.
 *
 * È la sola porta che valida (regola 12): la risposta viene da un servizio
 * esterno e collaborativo, quindi un campo mancante, un tipo sbagliato o un
 * numero fuori scala non devono mai arrivare al diario. Un prodotto senza
 * tutti i macro non si scarta — si segna incompleto, e la schermata lo dice
 * invece di far finta che siano zero (regola 6). Usata sia dalla ricerca per
 * nome (una lista) sia da quella per codice a barre (un prodotto solo), così
 * le due strade non possono divergere su cosa vuol dire "prodotto valido".
 */
function leggiProdotto(voce: unknown): ProdottoOFF | null {
  if (typeof voce !== "object" || voce === null) return null;
  const item = voce as Record<string, unknown>;

  const nome = testo(item.product_name, MAX_NOME);
  if (!nome) return null;

  const nutrienti =
    typeof item.nutriments === "object" && item.nutriments !== null
      ? (item.nutriments as Record<string, unknown>)
      : {};

  const kcal = numero(nutrienti["energy-kcal_100g"], MAX_KCAL_100G);
  // Senza calorie non c'è niente di utile da mostrare.
  if (kcal === null) return null;

  const carbs = numero(nutrienti["carbohydrates_100g"], MAX_MACRO_100G);
  const protein = numero(nutrienti["proteins_100g"], MAX_MACRO_100G);
  const fat = numero(nutrienti["fat_100g"], MAX_MACRO_100G);

  return {
    nome,
    marca: testo(item.brands, MAX_MARCA).split(",")[0]?.trim() ?? "",
    kcalPer100g: kcal,
    carbsPer100g: carbs ?? 0,
    proteinPer100g: protein ?? 0,
    fatPer100g: fat ?? 0,
    completo: carbs !== null && protein !== null && fat !== null,
  };
}

/** Trasforma la risposta della ricerca per nome in prodotti utilizzabili. */
export function normalizzaProdottiOFF(raw: unknown): ProdottoOFF[] {
  if (typeof raw !== "object" || raw === null) return [];
  const corpo = raw as Record<string, unknown>;
  const lista = Array.isArray(corpo.products) ? corpo.products : [];

  const prodotti: ProdottoOFF[] = [];
  for (const voce of lista.slice(0, MAX_RISULTATI)) {
    const prodotto = leggiProdotto(voce);
    if (prodotto) prodotti.push(prodotto);
  }
  return prodotti;
}

/**
 * Trasforma la risposta di una ricerca per codice a barre in un prodotto, o
 * null se il codice non corrisponde a niente.
 *
 * L'endpoint per prodotto di Open Food Facts risponde sempre con 200 e un
 * campo `status`: 1 vuol dire trovato, 0 vuol dire codice sconosciuto. Non è
 * un errore di rete né un prodotto rotto — è un fatto legittimo, un codice
 * scritto a mano può sbagliare una cifra — quindi si distingue da un vero
 * fallimento nel chiamante, non qui.
 */
export function normalizzaProdottoDaBarcode(raw: unknown): ProdottoOFF | null {
  if (typeof raw !== "object" || raw === null) return null;
  const corpo = raw as Record<string, unknown>;
  if (corpo.status !== 1) return null;
  return leggiProdotto(corpo.product);
}

/**
 * Un codice a barre digitato a mano è utilizzabile solo con queste
 * lunghezze: EAN-8, UPC-12, EAN-13 o GTIN-14, tutte solo cifre. Qualunque
 * altra cosa non vale la pena mandarla al server — risparmia un giro di
 * rete per un errore di battitura già visibile mentre si digita.
 */
export function barcodeValido(testo: string): boolean {
  return /^\d{8}$|^\d{12,14}$/.test(testo.trim());
}

/** I valori di un prodotto per la quantità scelta, in grammi. */
export function scalaProdotto(
  prodotto: ProdottoOFF,
  grammi: number,
): { kcal: number; carbs: number; protein: number; fat: number } {
  const fattore = grammi / 100;
  return {
    kcal: prodotto.kcalPer100g * fattore,
    carbs: prodotto.carbsPer100g * fattore,
    protein: prodotto.proteinPer100g * fattore,
    fat: prodotto.fatPer100g * fattore,
  };
}
