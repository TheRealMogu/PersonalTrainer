import { shiftIsoDate } from "./date";
import { isLogged, type DailyTotals } from "./history";
import { DAILY_TARGETS, type MacroKey } from "./targets";

/**
 * Il mese a colpo d'occhio.
 *
 * Nello storico si vedono sette o trenta colonne, ma il mese non si coglie:
 * per sapere se ottobre e' andato meglio di settembre bisogna leggere trenta
 * barre una per una. Un calendario lo dice in un secondo.
 */

/**
 * Com'e' andato un giorno rispetto al target.
 *
 * Tre stati e non due, ed e' il punto: **"non registrato" non e' "zero"**.
 * Un mese con dieci caselle vuote e venti verdi racconta una cosa; lo stesso
 * mese con dieci caselle rosse ne racconterebbe un'altra, e falsa.
 */
export type StatoGiorno = "non-registrato" | "entro" | "oltre" | "futuro";

export type CasellaMese = {
  day: string;
  stato: StatoGiorno;
  /** Il valore del macro guardato, per l'etichetta di chi non vede i colori. */
  valore: number;
};

export type GrigliaMese = {
  /** Il primo giorno del mese, in ISO. */
  primo: string;
  /** Caselle vuote prima del primo giorno, per allineare le colonne al lunedi'. */
  vuotePrima: number;
  caselle: CasellaMese[];
  /** Giorni conclusi e registrati, cioe' quelli su cui il conto ha senso. */
  registrati: number;
  /** Di quelli, quanti entro il target. */
  entro: number;
};

/** Quanti giorni ha il mese di una data ISO. */
export function giorniDelMese(iso: string): number {
  const anno = Number(iso.slice(0, 4));
  const mese = Number(iso.slice(5, 7));
  // Giorno 0 del mese dopo = ultimo giorno di questo, calcolato su UTC.
  return new Date(Date.UTC(anno, mese, 0)).getUTCDate();
}

/** Che giorno della settimana e', con lunedi' = 0. */
export function indiceSettimana(iso: string): number {
  const giorni = Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
  return (((giorni + 3) % 7) + 7) % 7;
}

/**
 * Costruisce la griglia di un mese per un macro.
 *
 * `oggi` serve a distinguere i giorni che devono ancora arrivare da quelli
 * saltati: contare come "non registrato" il 30 del mese quando siamo al 12
 * direbbe che hai saltato diciotto giorni che non sono ancora esistiti.
 */
export function costruisciMese(
  giorni: DailyTotals[],
  riferimento: string,
  oggi: string,
  macro: MacroKey = "kcal",
  target: number = DAILY_TARGETS[macro],
): GrigliaMese {
  const primo = `${riferimento.slice(0, 7)}-01`;
  const quanti = giorniDelMese(riferimento);
  const perGiorno = new Map(giorni.map((g) => [g.day, g]));

  const caselle: CasellaMese[] = [];
  let registrati = 0;
  let entro = 0;

  for (let i = 0; i < quanti; i += 1) {
    const day = shiftIsoDate(primo, i);
    const riga = perGiorno.get(day);

    if (day > oggi) {
      caselle.push({ day, stato: "futuro", valore: 0 });
      continue;
    }

    if (!riga || !isLogged(riga)) {
      caselle.push({ day, stato: "non-registrato", valore: 0 });
      continue;
    }

    const valore = riga[macro];
    const stato: StatoGiorno = valore <= target ? "entro" : "oltre";
    // Oggi si disegna ma non si conta: a meta' giornata sei sempre "entro",
    // e sarebbe un premio per una giornata che non e' ancora successa.
    if (day < oggi) {
      registrati += 1;
      if (stato === "entro") entro += 1;
    }
    caselle.push({ day, stato, valore });
  }

  return {
    primo,
    vuotePrima: indiceSettimana(primo),
    caselle,
    registrati,
    entro,
  };
}

const NOMI_MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
] as const;

export function nomeMese(iso: string): string {
  return NOMI_MESI[Number(iso.slice(5, 7)) - 1];
}

/**
 * Il riassunto del mese, col suo denominatore.
 *
 * "18 giorni entro il target" da solo non dice niente: su venti e' un mese
 * ottimo, su trenta e' un altro discorso. E se non hai registrato niente lo
 * si dice, invece di scrivere "0 su 0".
 */
export function riassuntoMese(griglia: GrigliaMese): string {
  if (griglia.registrati === 0) {
    return "Nessun giorno registrato in questo mese.";
  }
  // Il singolare segue il numeratore, non il denominatore: "1 giorni entro il
  // target su 2" e' proprio quello che scriveva prima che un test lo vedesse.
  const parola = griglia.entro === 1 ? "giorno" : "giorni";
  return `${griglia.entro} ${parola} entro il target su ${griglia.registrati} registrati`;
}
