import { isIsoDate, lunediDellaSettimana, shiftIsoDate } from "./date";

/**
 * L'intervallo di un'esportazione.
 *
 * `null` da una parte vuol dire "senza limite": `{ da: null, a: null }` e'
 * tutto lo storico.
 */
export type IntervalloExport = {
  da: string | null;
  a: string | null;
};

export const TUTTO: IntervalloExport = { da: null, a: null };

/**
 * Legge `da` e `a` da una query string, e dice cosa non va.
 *
 * Non corregge di nascosto. Se scrivi un intervallo al contrario te lo dice
 * invece di girarlo: un file che contiene un periodo diverso da quello che
 * hai chiesto e' peggio di un errore, perche' l'errore lo vedi.
 */
export function leggiIntervallo(
  params: URLSearchParams,
): { ok: true; intervallo: IntervalloExport } | { ok: false; errore: string } {
  const da = params.get("da");
  const a = params.get("a");

  if (da !== null && !isIsoDate(da)) {
    return { ok: false, errore: "La data di inizio non è valida. Usa il formato 2026-09-14." };
  }
  if (a !== null && !isIsoDate(a)) {
    return { ok: false, errore: "La data di fine non è valida. Usa il formato 2026-09-20." };
  }
  if (da !== null && a !== null && da > a) {
    return { ok: false, errore: "L'intervallo è al contrario: la fine viene prima dell'inizio." };
  }

  return { ok: true, intervallo: { da, a } };
}

/** La settimana di `oggi`, da lunedi' a domenica. */
export function settimanaDi(oggi: string): IntervalloExport {
  const lunedi = lunediDellaSettimana(oggi);
  return { da: lunedi, a: shiftIsoDate(lunedi, 6) };
}

/** Il mese di `oggi`, dal primo all'ultimo giorno. */
export function meseDi(oggi: string): IntervalloExport {
  const anno = Number(oggi.slice(0, 4));
  const mese = Number(oggi.slice(5, 7));
  // Giorno 0 del mese dopo = ultimo giorno di questo. Su UTC, quindi niente
  // sorprese quando il fuso locale e' avanti.
  const ultimo = new Date(Date.UTC(anno, mese, 0)).getUTCDate();
  const mm = String(mese).padStart(2, "0");
  return { da: `${anno}-${mm}-01`, a: `${anno}-${mm}-${String(ultimo).padStart(2, "0")}` };
}

/**
 * Il pezzo di nome del file che dice cosa c'e' dentro.
 *
 * Un file che contiene una settimana e si chiama come quello che contiene
 * tutto e' una trappola: fra sei mesi, in cartella, non c'e' modo di
 * distinguerli. E se lo mandi al personal trainer, lui non ha modo di sapere
 * che sta guardando sette giorni e non sei mesi.
 */
export function suffissoNome(intervallo: IntervalloExport, oggi: string): string {
  const { da, a } = intervallo;
  if (da === null && a === null) return `tutto-${oggi}`;
  if (da !== null && a !== null) return `${da}_${a}`;
  if (da !== null) return `dal-${da}`;
  return `fino-al-${a}`;
}

/**
 * La stessa cosa a parole, per il JSON e per chi legge.
 *
 * Vale la regola dei denominatori: un dato che esce dall'app si porta dietro
 * quello che lo delimita, altrimenti chi lo riceve gli da' il significato
 * sbagliato.
 */
export function descriviIntervallo(intervallo: IntervalloExport): string {
  const { da, a } = intervallo;
  if (da === null && a === null) return "tutto lo storico";
  if (da !== null && a !== null) return `dal ${da} al ${a}`;
  if (da !== null) return `dal ${da} in poi`;
  return `fino al ${a}`;
}
