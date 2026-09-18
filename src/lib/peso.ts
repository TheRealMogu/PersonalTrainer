/**
 * Il peso corporeo: un numero al giorno, e il confronto che chiede il PT
 * ogni domenica -- "peso della settimana scorsa e di questa".
 */

/** Largo ma non assurdo: ferma le dita, non allena. */
export const MIN_PESO_KG = 20;
export const MAX_PESO_KG = 400;

export type PesoGiorno = { day: string; weightKg: number };

/**
 * Scrive il peso come a schermo ovunque: un decimale, virgola italiana.
 *
 * Stessa logica di `formatMacro` in `nutrition.ts`, ma il peso non e' un
 * macro e non condivide quella tabella -- vive per conto suo.
 */
export function formatPeso(kg: number): string {
  return String(Math.round(kg * 10) / 10).replace(".", ",");
}

/**
 * L'ultimo peso registrato dentro un intervallo, o null se non ce n'e' uno.
 *
 * "Ultimo" e non "media": di solito ci si pesa una volta, magari due, e
 * quello che conta per il confronto settimanale e' l'ultima misura, non un
 * numero mescolato con quelle di giorni diversi.
 */
export function ultimoPeso(
  righe: PesoGiorno[],
  da: string,
  a: string
): number | null {
  const nellIntervallo = righe.filter((riga) => riga.day >= da && riga.day <= a);
  if (nellIntervallo.length === 0) return null;
  return nellIntervallo.reduce((ultimo, riga) =>
    riga.day > ultimo.day ? riga : ultimo
  ).weightKg;
}
