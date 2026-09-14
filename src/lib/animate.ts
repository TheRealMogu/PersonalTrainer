/**
 * Durata dello scorrimento dei numeri.
 *
 * Abbastanza da vedersi, poco da non far aspettare: il valore vero e' gia'
 * leggibile a meta' corsa, e la regola dei 100 ms sul riscontro resta
 * rispettata perche' il numero comincia a muoversi subito.
 */
export const DURATA_CONTEGGIO_MS = 420;

/**
 * Curva di uscita: parte veloce e rallenta arrivando.
 *
 * Un'animazione lineare sembra meccanica; questa sembra che il numero si
 * "posi" sul valore finale.
 */
export function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Valore intermedio fra due numeri, al tempo `t` fra 0 e 1.
 *
 * Funzione pura, cosi' si puo' provare senza un browser: il resto
 * dell'animazione e' solo un orologio che la chiama.
 */
export function valoreIntermedio(da: number, a: number, t: number): number {
  const avanzamento = t <= 0 ? 0 : t >= 1 ? 1 : easeOut(t);
  return da + (a - da) * avanzamento;
}
