import type { WorkoutSet } from "@/db/schema";

/** Una serie come la mostra la UI, senza i campi di servizio del database. */
export type LoggedSet = Pick<WorkoutSet, "id" | "exerciseId" | "setNumber" | "weight" | "reps"> & {
  /** Registrata ma non ancora arrivata al server: e' in coda sul telefono. */
  inAttesa?: boolean;
};

/**
 * Volume di una serie: carico per ripetizioni. E' il numero che dice se stai
 * progredendo davvero, perche' tiene insieme i chili e il lavoro fatto —
 * 60 kg x 10 e 80 kg x 5 pesano quanto sembrano.
 */
export function setVolume(set: Pick<LoggedSet, "weight" | "reps">): number {
  return set.weight * set.reps;
}

export function totalVolume(sets: Pick<LoggedSet, "weight" | "reps">[]): number {
  return sets.reduce((sum, set) => sum + setVolume(set), 0);
}

/** Kilogrammi arrotondati per la UI: i decimali qui non dicono niente. */
/**
 * Il raggruppamento delle migliaia si dichiara invece di lasciarlo al
 * predefinito.
 *
 * Con `useGrouping: "auto"` browser e server non danno la stessa cosa sui
 * numeri di quattro cifre: Chromium scrive 2.935, Node scrive 2935 (regola
 * CLDR `min2`, che raggruppa solo da cinque cifre in su). Il risultato erano
 * due formati diversi nella stessa app -- "4548 kg" nella lista degli ultimi
 * allenamenti, resa dal server, e "1.815 kg" nella testata della seduta, resa
 * dal browser -- piu' un errore di idratazione a ogni apertura.
 */
const VOLUME = new Intl.NumberFormat("it-IT", {
  useGrouping: "always",
  maximumFractionDigits: 0,
});

export function formatVolume(kg: number): string {
  return VOLUME.format(Math.round(kg));
}

/** I chili si scrivono con al massimo un decimale (i dischi da 0,5 esistono). */
export function formatWeight(kg: number): string {
  return (Math.round(kg * 10) / 10).toString().replace(".", ",");
}

/**
 * Accetta sia la virgola sia il punto: sulla tastiera dell'iPhone il
 * separatore decimale italiano e' la virgola.
 */
export function parseWeight(value: string): number {
  if (value.trim() === "") return 0;
  return Number(value.replace(",", "."));
}

/**
 * Se il carico di questo esercizio si scrive per manubrio o in totale.
 *
 * "12 kg" su un curl con i manubri non vuol dire niente da solo: possono
 * essere due manubri da 12 o due da 6. Sono due allenamenti diversi, e a
 * distanza di un mese non c'e' modo di sapere quale dei due hai fatto.
 *
 * La convenzione e' quella della palestra: si scrive il peso di UN manubrio.
 * Qui non si indovina dal tipo di attrezzo -- si legge il nome, che nel
 * programma dice sempre "manubri" quando sono manubri.
 */
export function caricoPerManubrio(nomeEsercizio: string): boolean {
  return /manubri/i.test(nomeEsercizio);
}

/** L'etichetta sopra al campo del carico. Corta: ci sta anche a 320 px. */
export function etichettaCarico(nomeEsercizio: string): string {
  return caricoPerManubrio(nomeEsercizio) ? "kg a manubrio" : "kg";
}

export type SetSuggestion = { weight: number; reps: number };

/**
 * Cosa proporre per la prossima serie. In ordine: l'ultima serie di questa
 * seduta (stai gia' lavorando, resti su quel carico), altrimenti quella che
 * hai fatto l'ultima volta su questo esercizio. Se non c'e' storia, nessuna
 * proposta: meglio un campo vuoto che un numero inventato.
 */
export function suggestNextSet(
  setsInSession: Pick<LoggedSet, "weight" | "reps">[],
  lastTime: Pick<LoggedSet, "weight" | "reps">[],
): SetSuggestion | null {
  const source = setsInSession.length > 0 ? setsInSession : lastTime;
  const last = source.at(-1);
  return last ? { weight: last.weight, reps: last.reps } : null;
}

/** Raggruppa le serie per esercizio, mantenendo l'ordine di esecuzione. */
export function groupByExercise(sets: LoggedSet[]): Map<number, LoggedSet[]> {
  const grouped = new Map<number, LoggedSet[]>();
  for (const set of [...sets].sort((a, b) => a.setNumber - b.setNumber || a.id - b.id)) {
    const existing = grouped.get(set.exerciseId);
    if (existing) existing.push(set);
    else grouped.set(set.exerciseId, [set]);
  }
  return grouped;
}

/** Durata in mm:ss, o h:mm:ss quando la seduta supera l'ora. */
export function formatElapsed(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Massimale stimato con la formula di Epley: carico × (1 + ripetizioni/30).
 *
 * Serve perche' "80 kg × 5" e "70 kg × 10" non sono confrontabili a occhio,
 * ma dicono cose simili sulla forza. Normalizzando si vede se il carico sale
 * davvero nei mesi, non solo se oggi hai messo un disco in piu'.
 *
 * E' una stima, non una misura: serve a confrontare sedute fra loro, non a
 * dirti quanto alzi davvero in singola.
 */
export function estimatedOneRepMax(set: Pick<LoggedSet, "weight" | "reps">): number {
  if (set.weight <= 0 || set.reps <= 0) return 0;
  return set.weight * (1 + set.reps / 30);
}

/** Il massimale stimato piu' alto di una seduta: la serie che conta davvero. */
export function bestOneRepMax(sets: Pick<LoggedSet, "weight" | "reps">[]): number {
  return sets.reduce((best, set) => Math.max(best, estimatedOneRepMax(set)), 0);
}

/**
 * Quale giornata tocca adesso.
 *
 * Il programma e' una rotazione: dopo Day 1 viene Day 2, dopo l'ultima si
 * ricomincia. L'app lo sa gia' dallo storico, quindi non c'e' motivo di
 * chiederlo a chi entra in palestra con il telefono in mano.
 *
 * E' un suggerimento, non un vincolo: le altre giornate restano tutte
 * avviabili. Se hai saltato un giorno o vuoi rifare la stessa, decidi tu.
 */
export function suggestNextDayId(
  orderedDayIds: readonly number[],
  lastCompletedDayId: number | null,
): number | null {
  if (orderedDayIds.length === 0) return null;

  const previous = lastCompletedDayId === null ? -1 : orderedDayIds.indexOf(lastCompletedDayId);

  // Mai allenato, o l'ultima giornata non e' piu' nel programma: si riparte
  // dalla prima invece di indovinare.
  if (previous === -1) return orderedDayIds[0];

  return orderedDayIds[(previous + 1) % orderedDayIds.length];
}
