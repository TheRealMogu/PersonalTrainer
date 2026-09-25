import {
  DAILY_TARGETS,
  MACRO_LABELS,
  MACRO_ORDER,
  MACRO_UNITS,
  type MacroKey,
} from "./targets";

/** I target rispetto a cui si misura. Predefiniti: quelli del codice. */
type Target = Record<MacroKey, number>;

export type MacroTotals = Record<MacroKey, number>;

export type MacroSource = {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

export const EMPTY_TOTALS: MacroTotals = {
  kcal: 0,
  carbs: 0,
  protein: 0,
  fat: 0,
};

/** Somma i macro di una lista di pasti. */
export function sumMacros(items: MacroSource[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (acc, item) => {
      for (const key of MACRO_ORDER) {
        acc[key] += item[key];
      }
      return acc;
    },
    { ...EMPTY_TOTALS }
  );
}

/**
 * Le calorie registrate senza sapere da quali macro arrivano.
 *
 * Servono a non far mentire le barre. Se hai segnato 350 kcal mangiando
 * fuori, i carboidrati a schermo dicono "88,4 g" ed e' vero solo per i pasti
 * scomposti: dentro la giornata ce ne sono altri, semplicemente non si sa
 * quanti. Un'app che tace qui sta dando per zero un numero che non conosce,
 * ed e' la regola 5 al contrario.
 *
 * L'anello delle calorie invece resta giusto: quelle si sanno.
 */
export function kcalNonScomposte(
  items: { kcal: number; onlyKcal?: boolean }[]
): number {
  return items.reduce(
    (somma, item) => (item.onlyKcal ? somma + item.kcal : somma),
    0
  );
}

/**
 * La frase da mettere sotto le barre, una volta sola.
 *
 * Una volta sola e non su ogni macro: ripeterla tre volte trasformerebbe
 * un'informazione in un rimprovero, ed e' la regola 8. Stringa vuota quando
 * non c'e' niente da dichiarare, cosi' chi la usa non deve decidere.
 */
export function avvisoNonScomposte(kcal: number): string {
  if (kcal <= 0) return "";
  return `Più ${formatMacro(
    kcal,
    "kcal"
  )} kcal senza macro, registrate a occhio.`;
}

/**
 * Arrotonda e scrive per la UI: i grammi a una cifra decimale, le kcal a
 * intero.
 *
 * Il separatore decimale e' la virgola, come ovunque nell'app. Prima qui
 * usciva il punto -- `toString()` scrive alla maniera inglese -- e nella
 * stessa schermata si leggeva "12,5 kg" accanto a "C 230.6": due convenzioni
 * in tre centimetri.
 *
 * La virgola si mette a mano invece di passare da `toLocaleString`, che senza
 * opzioni esplicite non da' lo stesso risultato sul server e nel browser.
 * Trappola gia' pagata in questo repo, con un errore di idratazione a ogni
 * apertura.
 *
 * Le migliaia restano senza punto: "1845 kcal", non "1.845". Il volume in
 * palestra invece le raggruppa (`formatVolume`), ed e' una differenza voluta
 * -- li' i numeri arrivano a cinque cifre, qui si fermano a quattro, dove il
 * punto costa un carattere nell'anello e non fa guadagnare niente in
 * leggibilita'.
 */
/**
 * Lo stesso arrotondamento che fa `formatMacro`, ma come numero.
 *
 * Serve a chi deve *decidere* qualcosa sul valore arrotondato -- per esempio
 * se lo scarto dal target e' zero e va scritto "in linea". Prima quel
 * confronto si faceva con `Number(formatMacro(...))`, che ha smesso di
 * funzionare il giorno in cui il formattatore ha cominciato a scrivere la
 * virgola: `Number("10,6")` e' `NaN`, e a schermo compariva "+NaN g".
 *
 * La lezione, piu' che la riga: un numero formattato e' testo per le
 * persone, e rileggerlo come numero e' sempre un giro sbagliato. Se serve il
 * valore, si arrotonda e basta.
 */
export function arrotondaMacro(value: number, key: MacroKey): number {
  return key === "kcal" ? Math.round(value) : Math.round(value * 10) / 10;
}

export function formatMacro(value: number, key: MacroKey): string {
  return String(arrotondaMacro(value, key)).replace(".", ",");
}

/**
 * Lo scarto dal target, con l'etichetta che dice cosa significa.
 *
 * "−217 kcal" da solo si legge come un rimprovero anche quando non lo è:
 * chi guarda deve indovinare se è sotto o sopra il target. "sotto il
 * target" descrive il numero, non giudica chi l'ha prodotto (regola 8).
 */
export function etichettaScarto(delta: number, key: MacroKey): string {
  const rounded = arrotondaMacro(Math.abs(delta), key);
  if (rounded === 0) return "in linea";
  const segno = delta > 0 ? "+" : "−";
  const direzione = delta > 0 ? "sopra il target" : "sotto il target";
  return `${segno}${formatMacro(rounded, key)} ${MACRO_UNITS[key]} · ${direzione}`;
}

export type MacroProgress = {
  key: MacroKey;
  consumed: number;
  target: number;
  /** Quanto manca al target; 0 se raggiunto o superato. */
  remaining: number;
  /** Quanto si è oltre il target; 0 se si è ancora sotto. */
  over: number;
  /** Percentuale 0-100 usata per riempire la barra. */
  percent: number;
  isOver: boolean;
};

export function buildProgress(
  totals: MacroTotals,
  targets: Target = DAILY_TARGETS
): MacroProgress[] {
  return MACRO_ORDER.map((key) => {
    const consumed = totals[key];
    const target = targets[key];
    const diff = target - consumed;
    return {
      key,
      consumed,
      target,
      remaining: diff > 0 ? diff : 0,
      over: diff < 0 ? -diff : 0,
      percent: Math.min(100, target > 0 ? (consumed / target) * 100 : 0),
      isOver: consumed > target,
    };
  });
}

export type FitVerdict = {
  /** Vero se non fa passare oltre il target nessun macro che ancora ci sta. */
  fits: boolean;
  /** I macro che questo alimento farebbe sforare, per dirlo invece di colorare. */
  exceeds: MacroKey[];
};

/**
 * Se un alimento "ci sta ancora" in quello che resta della giornata.
 *
 * I macro gia' oltre target non vengono contati: se hai gia' sforato i
 * carboidrati, qualunque cosa li peggiora, e segnalarlo su ogni alimento
 * farebbe sembrare tutto proibito senza aiutare a scegliere. Conta solo dove
 * hai ancora margine.
 *
 * Non e' un consiglio nutrizionale: e' la sottrazione che faresti a mente,
 * fatta da chi ha gia' i numeri sotto mano.
 */
export function fitsInRemaining(
  totals: MacroTotals,
  item: MacroSource,
  targets: Target = DAILY_TARGETS
): FitVerdict {
  const exceeds = MACRO_ORDER.filter(
    (key) =>
      totals[key] <= targets[key] && totals[key] + item[key] > targets[key]
  );
  return { fits: exceeds.length === 0, exceeds };
}

/** I macro gia' oltre target, da dire una volta sola invece che su ogni alimento. */
export function alreadyOver(
  totals: MacroTotals,
  targets: Target = DAILY_TARGETS
): MacroKey[] {
  return MACRO_ORDER.filter((key) => totals[key] > targets[key]);
}

/** Un alimento con un nome, per proporlo dentro la sintesi. */
export type ArticoloConNome = MacroSource & { name: string };

/**
 * La riga che legge i numeri al posto tuo: "Ti restano 1390 kcal e 86 g di
 * proteine — petto di pollo e yogurt greco ci stanno."
 *
 * Le proteine e non un macro scelto a caso: è la coppia che PRODOTTO.md
 * stesso usa per descrivere "quanto mi resta" a cena ("600 kcal e 70 g di
 * proteine ancora da spendere") -- a differenza di carboidrati e grassi, che
 * arrivano quasi sempre di striscio dentro altri alimenti, le proteine sono
 * l'unico macro che di solito serve *cercare* apposta, quindi è l'unico che
 * vale la pena nominare in una frase e non lasciare alla barra.
 *
 * Non e' un consiglio nuovo: e' `buildProgress` e `fitsInRemaining`, che
 * esistono gia' e si guardano gia' uno alla volta, messi in una frase sola.
 * La sintesi oggi la fai a mente sommando l'anello e i tre riquadri; qui la
 * fa l'app.
 *
 * Stringa vuota a target gia' raggiunto o superato: a quel punto l'anello
 * rosso lo dice gia', e ripeterlo in una frase sarebbe un rimprovero
 * (regola 8), non una sintesi.
 */
export function buildInsight(
  totals: MacroTotals,
  targets: Target = DAILY_TARGETS,
  quickFoods: ArticoloConNome[] = []
): string {
  const progress = buildProgress(totals, targets);
  const kcal = progress.find((item) => item.key === "kcal")!;
  if (kcal.remaining <= 0) return "";

  const protein = progress.find((item) => item.key === "protein")!;
  const mostraProteine = protein.remaining > 0;

  let frase = `Ti restano ${formatMacro(kcal.remaining, "kcal")} kcal`;
  if (mostraProteine) {
    frase += ` e ${formatMacro(protein.remaining, "protein")} ${
      MACRO_UNITS.protein
    } di ${MACRO_LABELS.protein.toLowerCase()}`;
  }

  // Cosa ci sta ancora, dal piu' proteico: e' la stessa domanda a cui
  // risponde gia' "Cosa mi entra ancora", solo scelta per te invece che da
  // scorrere -- e sceglierla ordinando per proteine e' quello che chiude per
  // primo il divario appena nominato.
  const candidati = quickFoods
    .filter((food) => fitsInRemaining(totals, food, targets).fits)
    .sort((a, b) => b.protein - a.protein || a.kcal - b.kcal)
    .slice(0, 2);

  if (candidati.length === 1) {
    frase += ` — ${candidati[0].name} ci sta`;
  } else if (candidati.length === 2) {
    frase += ` — ${candidati[0].name} e ${candidati[1].name} ci stanno`;
  }

  return frase + ".";
}
