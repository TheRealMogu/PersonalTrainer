import { newClientId } from "./pending-sets";
import type { MealSlot } from "./meal-slots";

/**
 * Pasti registrati mentre la rete non c'era.
 *
 * Le serie in palestra questa rete di sicurezza ce l'hanno da un pezzo: se il
 * salvataggio fallisce la serie resta sul telefono e riparte da sola. Il
 * diario no -- compariva "Salvataggio non riuscito" e **il pasto era perso**.
 * Che e' peggio che in palestra, non meglio: una serie la rifai al prossimo
 * allenamento, un pranzo no.
 *
 * Qui dentro solo funzioni pure sulla lista, piu' due che leggono e scrivono:
 * la parte pura e' quella che si puo' provare davvero.
 */

export type PastoInAttesa = {
  /** Generato dal telefono: e' quello che rende sicuro riprovare. */
  clientId: string;
  day: string;
  slot: MealSlot;
  name: string;
  quantity: number;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  onlyKcal: boolean;
  /** Millisecondi, solo per tenere l'ordine di inserimento. */
  savedAt: number;
};

const CHIAVE = "pasti-in-attesa";

/**
 * Oltre questo numero si smette di accodare.
 *
 * Non e' un limite tecnico: se ci sono cento pasti in coda qualcosa e' rotto
 * da giorni, e continuare a riempire la memoria del telefono non aiuta
 * nessuno. Piu' basso di quello delle serie perche' di pasti se ne registrano
 * meno -- cinque al giorno, non quaranta.
 */
export const MAX_IN_ATTESA = 100;

function eUnPasto(valore: unknown): valore is PastoInAttesa {
  if (typeof valore !== "object" || valore === null) return false;
  const v = valore as Record<string, unknown>;
  return (
    typeof v.clientId === "string" &&
    v.clientId.length > 0 &&
    typeof v.day === "string" &&
    typeof v.slot === "string" &&
    typeof v.name === "string" &&
    typeof v.quantity === "number" &&
    Number.isFinite(v.quantity) &&
    typeof v.kcal === "number" &&
    Number.isFinite(v.kcal) &&
    typeof v.carbs === "number" &&
    typeof v.protein === "number" &&
    typeof v.fat === "number" &&
    typeof v.savedAt === "number" &&
    Number.isFinite(v.savedAt)
  );
}

/**
 * Legge la lista da una stringa.
 *
 * Non si fida di niente: quello che c'e' nella memoria del browser puo'
 * essere di una versione vecchia dell'app, o rotto a meta' da un salvataggio
 * interrotto. Le voci che non tornano si buttano, il resto si tiene --
 * perdere un pasto e' meglio che perderli tutti.
 */
export function leggiInAttesa(grezzo: string | null): PastoInAttesa[] {
  if (!grezzo) return [];
  try {
    const letto: unknown = JSON.parse(grezzo);
    if (!Array.isArray(letto)) return [];
    return letto
      .filter(eUnPasto)
      .map((p) => ({ ...p, onlyKcal: p.onlyKcal === true }))
      .slice(0, MAX_IN_ATTESA);
  } catch {
    return [];
  }
}

export function aggiungi(
  lista: readonly PastoInAttesa[],
  pasto: PastoInAttesa
): PastoInAttesa[] {
  if (lista.length >= MAX_IN_ATTESA) return [...lista];
  // Lo stesso identificativo non si accoda due volte.
  if (lista.some((p) => p.clientId === pasto.clientId)) return [...lista];
  return [...lista, pasto];
}

export function togli(
  lista: readonly PastoInAttesa[],
  clientId: string
): PastoInAttesa[] {
  return lista.filter((p) => p.clientId !== clientId);
}

/** I pasti in attesa di un giorno, nell'ordine in cui li hai registrati. */
export function inAttesaDelGiorno(
  lista: readonly PastoInAttesa[],
  day: string
): PastoInAttesa[] {
  return lista
    .filter((p) => p.day === day)
    .sort((a, b) => a.savedAt - b.savedAt);
}

/**
 * Cosa dire a schermo quando qualcosa e' in coda.
 *
 * Non "errore": un pasto in coda non e' perso, sta aspettando. Dirlo come un
 * guasto farebbe riscrivere a mano una cosa gia' salvata, e allora sì che si
 * finirebbe con un doppione.
 */
export function avvisoInAttesa(quanti: number): string {
  if (quanti <= 0) return "";
  if (quanti === 1) return "1 pasto aspetta la rete. Riparte da solo.";
  return `${quanti} pasti aspettano la rete. Ripartono da soli.`;
}

export { newClientId };

/* -------------------------------------------------------------------------
   Lettura e scrittura. Ogni accesso e' protetto: in navigazione privata
   `localStorage` esiste ma lancia, e il diario non deve fermarsi per questo.
   ------------------------------------------------------------------------- */

export function caricaInAttesa(): PastoInAttesa[] {
  try {
    return leggiInAttesa(window.localStorage.getItem(CHIAVE));
  } catch {
    return [];
  }
}

export function salvaInAttesa(lista: readonly PastoInAttesa[]): void {
  try {
    window.localStorage.setItem(CHIAVE, JSON.stringify(lista));
  } catch {
    // Memoria piena o scrittura negata: si continua comunque, i pasti restano
    // almeno in memoria finche' la pagina e' aperta.
  }
}
