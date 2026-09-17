import { OBIETTIVO_ACQUA } from "./targets";

/**
 * Il tetto di bicchieri in una giornata.
 *
 * Non e' un giudizio su quanto bevi: e' il limite oltre il quale un numero
 * e' quasi sempre un tocco ripetuto per sbaglio. Trenta bicchieri sono sette
 * litri e mezzo.
 */
export const MAX_BICCHIERI = 30;

/**
 * Millilitri scritti come li direbbe una persona.
 *
 * Sotto il litro si contano in millilitri, sopra in litri: "750 ml" e
 * "1,5 L", non "0,75 L" e "1,50 L". La virgola decimale si mette a mano
 * invece di passare da `toLocaleString`, che senza opzioni esplicite non da'
 * lo stesso risultato sul server e nel browser -- trappola gia' pagata una
 * volta in questo repo, con un errore di idratazione a ogni apertura.
 */
export function formatAcqua(ml: number): string {
  if (ml < 1000) return `${Math.round(ml)} ml`;
  const litri = Math.round((ml / 1000) * 100) / 100;
  return `${String(litri).replace(".", ",")} L`;
}

export type ProgressoAcqua = {
  bicchieri: number;
  obiettivo: number;
  ml: number;
  mlObiettivo: number;
  /** Quanti ne mancano; 0 se l'obiettivo e' raggiunto o superato. */
  restano: number;
  raggiunto: boolean;
  /** 0-100, per riempire i bicchieri disegnati. */
  percent: number;
};

export function progressoAcqua(bicchieri: number): ProgressoAcqua {
  const sicuri = Math.max(0, Math.min(MAX_BICCHIERI, Math.round(bicchieri)));
  const obiettivo = OBIETTIVO_ACQUA.bicchieri;
  const ml = sicuri * OBIETTIVO_ACQUA.mlPerBicchiere;

  return {
    bicchieri: sicuri,
    obiettivo,
    ml,
    mlObiettivo: obiettivo * OBIETTIVO_ACQUA.mlPerBicchiere,
    restano: Math.max(0, obiettivo - sicuri),
    raggiunto: sicuri >= obiettivo,
    percent: Math.min(100, obiettivo > 0 ? (sicuri / obiettivo) * 100 : 0),
  };
}

/**
 * Quanti bicchieri disegnare in fila.
 *
 * Almeno quelli dell'obiettivo, di piu' se hai bevuto di piu': chi supera
 * l'obiettivo deve vedere i bicchieri in piu', non un contatore che si ferma.
 * Il tetto e' lo stesso dell'inserimento.
 */
export function bicchieriDaMostrare(bicchieri: number): number {
  return Math.min(MAX_BICCHIERI, Math.max(OBIETTIVO_ACQUA.bicchieri, bicchieri));
}
