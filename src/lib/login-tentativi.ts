/**
 * Blocco dopo troppi tentativi di password sbagliati, per indirizzo IP.
 *
 * Prima c'era solo un'attesa fissa di 600ms: rallentava, non fermava mai
 * davvero chi prova password a raffica. Qui una riga per IP tiene il
 * conteggio e si azzera da sola quando passa la finestra -- niente da
 * ripulire a mano, niente lavoro in piu' per l'unico utente vero.
 */

/** Oltre questa soglia di tentativi sbagliati nella finestra, si blocca. */
export const MAX_TENTATIVI = 8;

/** La finestra in cui i tentativi si sommano: fuori da qui si riparte da zero. */
export const FINESTRA_MS = 15 * 60 * 1000;

/** Quanto dura il blocco, una volta scattato. */
export const BLOCCO_MS = 15 * 60 * 1000;

export type StatoTentativi = {
  tentativi: number;
  ultimoTentativo: Date;
  bloccatoFino: Date | null;
} | null;

/** Minuti restanti di blocco, o null se non e' (piu') bloccato. */
export function minutiDiBlocco(
  stato: StatoTentativi,
  ora: Date,
): number | null {
  if (!stato?.bloccatoFino || stato.bloccatoFino.getTime() <= ora.getTime())
    return null;
  return Math.ceil((stato.bloccatoFino.getTime() - ora.getTime()) / 60_000);
}

/**
 * Lo stato da scrivere dopo un tentativo sbagliato.
 *
 * Fuori dalla finestra il conteggio riparte da 1, come se non ci fossero
 * precedenti: e' quello che fa scadere il blocco da solo, senza un lavoro
 * a parte che lo tolga.
 */
export function prossimoTentativo(
  stato: StatoTentativi,
  ora: Date,
): { tentativi: number; bloccatoFino: Date | null } {
  const dentroFinestra =
    stato !== null &&
    ora.getTime() - stato.ultimoTentativo.getTime() < FINESTRA_MS;
  const tentativi = dentroFinestra ? stato.tentativi + 1 : 1;
  const bloccatoFino =
    tentativi >= MAX_TENTATIVI ? new Date(ora.getTime() + BLOCCO_MS) : null;
  return { tentativi, bloccatoFino };
}
