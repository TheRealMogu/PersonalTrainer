/**
 * Serie registrate mentre la rete non c'era.
 *
 * In palestra il segnale manca, e prima bastava una serie inviata nel momento
 * sbagliato per vederla sparire: l'aggiornamento ottimistico veniva scartato e
 * restava solo "Serie non salvata". Ora la serie resta sul telefono e viene
 * rimandata da sola quando la rete torna.
 *
 * Qui dentro solo funzioni pure sulla lista, piu' due che leggono e scrivono.
 * La parte pura e' quella che si puo' provare davvero.
 */

export type PendingSet = {
  /** Generato dal telefono: e' quello che rende sicuro riprovare. */
  clientId: string;
  sessionId: number;
  exerciseId: number;
  weight: number;
  reps: number;
  /** Millisecondi, solo per tenere l'ordine di esecuzione. */
  savedAt: number;
};

const KEY = "serie-in-attesa";

/**
 * Oltre questo numero si smette di accodare. Non e' un limite tecnico: se ci
 * sono duecento serie in coda qualcosa e' rotto da giorni, e continuare a
 * riempire la memoria del telefono non aiuta nessuno.
 */
export const MAX_PENDING = 200;

function isPendingSet(value: unknown): value is PendingSet {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.clientId === "string" &&
    v.clientId.length > 0 &&
    Number.isInteger(v.sessionId) &&
    Number.isInteger(v.exerciseId) &&
    typeof v.weight === "number" &&
    Number.isFinite(v.weight) &&
    Number.isInteger(v.reps) &&
    Number.isFinite(v.savedAt as number)
  );
}

/**
 * Legge la lista da una stringa. Non si fida di niente: quello che c'e' nella
 * memoria del browser puo' essere di una versione vecchia dell'app, o rotto a
 * meta' da un salvataggio interrotto. Le voci che non tornano si buttano, il
 * resto si tiene: perdere una serie e' meglio che perderle tutte.
 */
export function parsePending(raw: string | null): PendingSet[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPendingSet).slice(0, MAX_PENDING);
  } catch {
    return [];
  }
}

export function addPending(list: readonly PendingSet[], item: PendingSet): PendingSet[] {
  if (list.length >= MAX_PENDING) return [...list];
  // Lo stesso identificativo non si accoda due volte.
  if (list.some((p) => p.clientId === item.clientId)) return [...list];
  return [...list, item];
}

export function removePending(list: readonly PendingSet[], clientId: string): PendingSet[] {
  return list.filter((p) => p.clientId !== clientId);
}

/** Le serie in attesa di questa seduta, nell'ordine in cui sono state fatte. */
export function pendingForSession(list: readonly PendingSet[], sessionId: number): PendingSet[] {
  return list.filter((p) => p.sessionId === sessionId).sort((a, b) => a.savedAt - b.savedAt);
}

/**
 * Identificativo nuovo. `randomUUID` non c'e' su Safari prima della 15.4 e
 * fuori dai contesti sicuri: il ripiego non deve essere perfetto, deve solo
 * non ripetersi sullo stesso telefono.
 */
export function newClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* -------------------------------------------------------------------------
   Lettura e scrittura. Ogni accesso e' protetto: in navigazione privata
   localStorage esiste ma lancia, e un allenamento non deve fermarsi per
   questo.
   ------------------------------------------------------------------------- */

export function loadPending(): PendingSet[] {
  try {
    return parsePending(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export function savePending(list: readonly PendingSet[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Memoria piena o scrittura negata: si continua comunque, le serie
    // restano almeno in memoria finche' la pagina e' aperta.
  }
}
