/** Utility su date in formato YYYY-MM-DD, senza fusi orari. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && toIsoDate(parsed) === value;
}

export function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Fuso orario di riferimento dell'app. Va fissato: il server (Vercel gira in
 * UTC) e il device devono essere d'accordo su qual è "oggi", altrimenti tra
 * mezzanotte e le 2 il diario si aprirebbe sul giorno prima.
 */
export const TIME_ZONE = "Europe/Rome";

const TODAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

/** Data odierna in Italia, in formato YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  return TODAY_FORMATTER.format(now);
}

export function shiftIsoDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

/* Formato compatto: entra anche sugli schermi da 320 px. */
const FORMATTER = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "Oggi" / "Ieri" / "Domani", altrimenti "lun 3 mar". */
export function formatDayLabel(iso: string, today = todayIso()): string {
  if (iso === today) return "Oggi";
  if (iso === shiftIsoDate(today, -1)) return "Ieri";
  if (iso === shiftIsoDate(today, 1)) return "Domani";
  return FORMATTER.format(new Date(`${iso}T00:00:00Z`));
}

/** Iniziali dei giorni, dal lunedi'. */
const INIZIALI_GIORNI = ["L", "M", "M", "G", "V", "S", "D"] as const;

/**
 * Iniziale del giorno della settimana, per le etichette strette.
 *
 * Non passa da `Date.getDay()` per evitare il fuso: la data e' gia' una
 * stringa ISO senza ora, e va letta come tale.
 */
export function weekdayInitial(iso: string): string {
  const giorni = Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
  // Il 1970-01-01 era un giovedi': +3 sposta l'indice a partire dal lunedi'.
  return INIZIALI_GIORNI[(((giorni + 3) % 7) + 7) % 7];
}
