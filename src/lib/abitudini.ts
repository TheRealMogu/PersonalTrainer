import type { MealSlot } from "./meal-slots";

/**
 * Quante volte un alimento e' finito in un certo momento della giornata.
 *
 * Non e' una preferenza dichiarata: e' quello che hai gia' fatto. Chiederti
 * di assegnare ogni alimento a colazione o cena sarebbe una configurazione da
 * compilare, e le configurazioni da compilare non si compilano.
 */
export type UsoPerMomento = {
  name: string;
  slot: MealSlot;
  volte: number;
};

/** Il minimo che serve per ordinare: gli alimenti veri ne hanno di piu'. */
type Ordinabile = { id: number; name: string; sortOrder: number };

/**
 * I tasti rapidi nell'ordine in cui servono *adesso*.
 *
 * Alle otto in cima ci va quello che fai a colazione, non i primi dodici in
 * ordine di inserimento. L'ordine viene da quello che hai gia' registrato, e
 * cambia da solo quando cambiano le abitudini.
 *
 * Tre livelli, in quest'ordine:
 *
 * 1. quelli che mangi *in questo momento della giornata*, dal piu' frequente;
 * 2. quelli che mangi, ma in altri momenti, dal piu' frequente;
 * 3. quelli che non hai mai registrato, nell'ordine in cui stanno in archivio.
 *
 * Il terzo livello e' il motivo per cui non si ordina soltanto per frequenza:
 * senza storia non si inventa un ordine, si tiene quello che hai deciso tu.
 * A parita' di tutto vince `sortOrder`, cosi' la griglia non balla fra un
 * caricamento e l'altro.
 */
export function ordinaPerMomento<T extends Ordinabile>(
  foods: T[],
  usi: UsoPerMomento[],
  slot: MealSlot
): T[] {
  const inQuestoMomento = new Map<string, number>();
  const inTutti = new Map<string, number>();

  for (const uso of usi) {
    inTutti.set(uso.name, (inTutti.get(uso.name) ?? 0) + uso.volte);
    if (uso.slot === slot) {
      inQuestoMomento.set(
        uso.name,
        (inQuestoMomento.get(uso.name) ?? 0) + uso.volte
      );
    }
  }

  return [...foods].sort((a, b) => {
    const quiA = inQuestoMomento.get(a.name) ?? 0;
    const quiB = inQuestoMomento.get(b.name) ?? 0;
    if (quiA !== quiB) return quiB - quiA;

    const totA = inTutti.get(a.name) ?? 0;
    const totB = inTutti.get(b.name) ?? 0;
    if (totA !== totB) return totB - totA;

    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id - b.id;
  });
}

/**
 * Quanti tasti mostrare prima di "mostra tutti".
 *
 * Sei e non dodici perche' la griglia da dodici e' alta 720 px da sola, e
 * spinge la lista dei pasti a 1590 px: misurato, "vedere cosa ho mangiato"
 * costava tre gesti invece di uno. Sei righe di due coprono i casi normali --
 * dopo l'ordinamento qui sopra, quello che ti serve adesso e' in cima.
 */
export const QUANTI_SUBITO = 6;

/**
 * Un pasto gia' registrato, come serve per riproporlo.
 *
 * E' volutamente la stessa forma di un pasto nel diario: "come l'ultima
 * volta" non inventa niente, ricopia.
 */
export type PastoDaRipetere = {
  name: string;
  quantity: number;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  onlyKcal: boolean;
};

export type UltimaVolta = {
  /** Il giorno da cui si ricopia. */
  day: string;
  slot: MealSlot;
  pasti: PastoDaRipetere[];
};

/**
 * Come si chiama il tasto, detto per com'e' davvero.
 *
 * "Come ieri" quando e' ieri, il nome del giorno quando non lo e'. Scrivere
 * "come ieri" sopra a un pasto di giovedi' scorso e' una piccola bugia che
 * costa cara: ricopi quattro giorni di distanza credendo di ricopiare ieri, e
 * te ne accorgi solo guardando i numeri.
 */
export function etichettaUltimaVolta(
  ultima: UltimaVolta,
  oggi: string,
  ieri: string
): string {
  if (ultima.day === ieri) return "Come ieri";
  return `Come ${nomeGiornoLungo(ultima.day, oggi)}`;
}

const GIORNI = [
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
  "domenica",
] as const;

/**
 * Il nome del giorno, con la data quando e' passata piu' di una settimana.
 *
 * Oltre i sette giorni "come mercoledì" non identifica piu' niente: ce n'e'
 * stato piu' di uno.
 */
function nomeGiornoLungo(iso: string, oggi: string): string {
  const giorni = Math.round(
    (Date.parse(`${oggi}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) /
      86_400_000
  );
  const indice = Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
  const nome = GIORNI[(((indice + 3) % 7) + 7) % 7];
  if (giorni < 7) return nome;
  return `${nome} ${Number(iso.slice(8))}`;
}

/** Le calorie di quello che si sta per ricopiare: si vede prima di toccare. */
export function kcalDaRipetere(ultima: UltimaVolta): number {
  return ultima.pasti.reduce((somma, pasto) => somma + pasto.kcal, 0);
}
