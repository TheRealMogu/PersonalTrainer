import type { WorkoutSet } from "@/db/schema";

/** Una serie come la mostra la UI, senza i campi di servizio del database. */
export type LoggedSet = Pick<WorkoutSet, "id" | "exerciseId" | "setNumber" | "weight" | "reps">;

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
export function formatVolume(kg: number): string {
  return Math.round(kg).toLocaleString("it-IT");
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
