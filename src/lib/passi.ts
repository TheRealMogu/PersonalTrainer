/**
 * I passi: un numero al giorno, letto sul telefono e scritto qui a mano.
 *
 * Non c'e' un contapassi nell'app -- ci vorrebbe un plugin nativo e un
 * permesso in piu' solo per un numero che il telefono sa gia'. Il gesto e'
 * quello del peso: si scrive una volta, non si tocca piu' volte come i
 * bicchieri d'acqua.
 */

/** Largo ma non assurdo: ferma un errore di battitura, non un maratoneta. */
export const MIN_PASSI = 0;
export const MAX_PASSI = 100_000;

export type PassiGiorno = { day: string; steps: number };

/** Migliaia separate da un punto, come si scrivono in italiano: "8.412". */
export function formatPassi(passi: number): string {
  return Math.round(passi).toLocaleString("it-IT", { useGrouping: true });
}
