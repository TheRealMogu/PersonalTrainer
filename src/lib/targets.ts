/**
 * I target di partenza.
 *
 * Non sono piu' "i" target: sono quelli che valgono finche' non ne scrivi
 * altri in *Piano -> Obiettivi*. Restano qui perche' l'app deve funzionare
 * anche prima che quella riga esista -- alla prima apertura, o se la lettura
 * delle impostazioni fallisce. Una schermata che aspetta di sapere i target
 * per mostrare qualcosa e' una schermata che non si apre.
 *
 * Tutto quello che li usa accetta anche altri numeri: cerca `Obiettivi`.
 *
 * Numeri generici e non i tuoi veri, di proposito: questi finiscono nel
 * codice sorgente, i tuoi nel database. Cambiarli qui non tocca l'app in
 * produzione, dove la riga `targets` esiste gia'.
 */
export const DAILY_TARGETS = {
  kcal: 2050,
  carbs: 250,
  protein: 150,
  fat: 50,
} as const;

export type MacroKey = keyof typeof DAILY_TARGETS;

export const MACRO_LABELS: Record<MacroKey, string> = {
  kcal: "Calorie",
  carbs: "Carboidrati",
  protein: "Proteine",
  fat: "Grassi",
};

export const MACRO_UNITS: Record<MacroKey, string> = {
  kcal: "kcal",
  carbs: "g",
  protein: "g",
  fat: "g",
};

export const MACRO_ORDER: MacroKey[] = ["kcal", "carbs", "protein", "fat"];

/**
 * L'acqua non e' un macro e non entra in `DAILY_TARGETS`.
 *
 * I macro hanno un colore validato, una barra, un conteggio che finisce nelle
 * medie e nei grafici. L'acqua e' un contatore e basta: mescolarla ai macro
 * la farebbe entrare in medie e statistiche dove non c'entra, e costringerebbe
 * a darle un colore fra quelli gia' assegnati.
 *
 * Il bicchiere e' l'unita' vera: nessuno beve "250 millilitri", beve un
 * bicchiere. I millilitri servono solo a scrivere il totale in litri.
 */
export const OBIETTIVO_ACQUA = {
  bicchieri: 8,
  mlPerBicchiere: 250,
} as const;

/** Stessa ragione dell'acqua: i passi non sono un macro, non entrano nelle medie. */
export const OBIETTIVO_PASSI = 10_000;

/**
 * I numeri modificabili, letti insieme perche' si cambiano insieme.
 *
 * `MacroTotals` non va bene come tipo: quello e' una somma di macro, questa
 * e' una soglia. Stesso contenuto, significato opposto -- e confonderli
 * porta a sommare un target a un pasto senza che nessuno se ne accorga.
 */
export type Obiettivi = {
  macro: Record<MacroKey, number>;
  bicchieriAcqua: number;
  passiGiornalieri: number;
};

/** Gli obiettivi di partenza, quando non ne sono stati scritti altri. */
export const OBIETTIVI_PREDEFINITI: Obiettivi = {
  macro: { ...DAILY_TARGETS },
  bicchieriAcqua: OBIETTIVO_ACQUA.bicchieri,
  passiGiornalieri: OBIETTIVO_PASSI,
};

/** Tetti larghi: fermano un numero digitato male, non giudicano una dieta. */
export const LIMITI_OBIETTIVI = {
  kcal: { min: 500, max: 10000 },
  grammi: { min: 0, max: 1000 },
  bicchieri: { min: 1, max: 30 },
  passi: { min: 1000, max: 50000 },
} as const;

/**
 * Controlla degli obiettivi scritti a mano, e dice cosa non va.
 *
 * Restituisce il messaggio da mostrare, o null se vanno bene: non lancia e
 * non corregge di nascosto. Correggere di nascosto un numero che hai appena
 * scritto e' il modo piu' rapido di far perdere fiducia a una schermata di
 * impostazioni.
 */
export function validaObiettivi(o: Obiettivi): string | null {
  const { kcal, grammi, bicchieri, passi } = LIMITI_OBIETTIVI;

  if (!Number.isFinite(o.macro.kcal) || o.macro.kcal < kcal.min || o.macro.kcal > kcal.max) {
    return `Le calorie devono stare fra ${kcal.min} e ${kcal.max}.`;
  }
  for (const chiave of ["carbs", "protein", "fat"] as const) {
    const valore = o.macro[chiave];
    if (!Number.isFinite(valore) || valore < grammi.min || valore > grammi.max) {
      return `${MACRO_LABELS[chiave]}: il valore deve stare fra ${grammi.min} e ${grammi.max} g.`;
    }
  }
  if (
    !Number.isInteger(o.bicchieriAcqua) ||
    o.bicchieriAcqua < bicchieri.min ||
    o.bicchieriAcqua > bicchieri.max
  ) {
    return `I bicchieri d'acqua devono stare fra ${bicchieri.min} e ${bicchieri.max}.`;
  }
  if (
    !Number.isInteger(o.passiGiornalieri) ||
    o.passiGiornalieri < passi.min ||
    o.passiGiornalieri > passi.max
  ) {
    return `I passi al giorno devono stare fra ${passi.min} e ${passi.max}.`;
  }
  return null;
}

/**
 * Le calorie che i macro dichiarano, secondo Atwater.
 *
 * Serve a dire se i target sono coerenti fra loro. Non si impone: una dieta
 * puo' avere un margine voluto, e un'app che rifiuta i numeri del personal
 * trainer perche' non tornano al grammo e' un'app che si fa scavalcare.
 */
export function kcalDaiMacro(macro: Record<MacroKey, number>): number {
  return macro.carbs * 4 + macro.protein * 4 + macro.fat * 9;
}
