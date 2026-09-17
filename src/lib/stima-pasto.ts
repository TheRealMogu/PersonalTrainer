import type { QuickFood } from "@/db/schema";
import { isMealSlot, type MealSlot } from "./meal-slots";

/**
 * Un alimento arrivato da fuori, con i macro stimati.
 *
 * "Stimati" e' la parola importante: questi numeri non escono dal database,
 * escono da una conversazione in cui qualcuno ha letto "due uova e una fetta
 * di pane". Restano una proposta finche' non li confermi, e l'interfaccia lo
 * dice a chiare lettere. La regola 5 di PRODOTTO.md vieta i numeri
 * inventati: un numero dichiarato come stima, che puoi correggere prima di
 * salvarlo, non lo e'.
 */
export type AlimentoStimato = {
  nome: string;
  /** Come la quantita' e' stata intesa: "2 uova", "80 g", "1 tazza". */
  porzione: string;
  slot: MealSlot;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  /** Vero quando la quantita' non c'era nel testo ed e' stata supposta. */
  supposta: boolean;
};

export type Stima = {
  alimenti: AlimentoStimato[];
  /** Una riga sola, vuota se non c'e' niente da segnalare. */
  nota: string;
};

/** Tetti larghi: servono a fermare un numero impazzito, non a giudicare un pasto. */
const MAX_KCAL = 5000;
const MAX_GRAMMI = 1000;
const MAX_ALIMENTI = 20;
/** Lo stesso limite che applica `addMeal`: inutile proporre cio' che verra' rifiutato. */
const MAX_NOME = 120;

function numero(value: unknown, massimo: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  if (value > massimo) return null;
  return value;
}

function testo(value: unknown, massimo: number): string {
  return typeof value === "string" ? value.trim().slice(0, massimo) : "";
}

/**
 * Trasforma la risposta del modello in alimenti utilizzabili, scartando
 * quelli che non lo sono.
 *
 * Tutto quello che arriva da qui e' da trattare come input non fidato: lo
 * schema JSON rende improbabile una risposta storta, non impossibile, e una
 * riga senza nome o con 40.000 kcal non deve arrivare al diario.
 */
export function normalizzaStima(raw: unknown, slotPredefinito: MealSlot): Stima {
  if (typeof raw !== "object" || raw === null) return { alimenti: [], nota: "" };

  const corpo = raw as Record<string, unknown>;
  const lista = Array.isArray(corpo.alimenti) ? corpo.alimenti : [];
  const alimenti: AlimentoStimato[] = [];

  for (const voce of lista.slice(0, MAX_ALIMENTI)) {
    if (typeof voce !== "object" || voce === null) continue;
    const item = voce as Record<string, unknown>;

    const nome = testo(item.nome, MAX_NOME);
    if (!nome) continue;

    const kcal = numero(item.kcal, MAX_KCAL);
    const carbs = numero(item.carboidrati, MAX_GRAMMI);
    const protein = numero(item.proteine, MAX_GRAMMI);
    const fat = numero(item.grassi, MAX_GRAMMI);
    if (kcal === null || carbs === null || protein === null || fat === null) continue;

    alimenti.push({
      nome,
      porzione: testo(item.porzione, 40),
      slot: isMealSlot(item.momento) ? item.momento : slotPredefinito,
      kcal,
      carbs,
      protein,
      fat,
      supposta: item.quantita_supposta === true,
    });
  }

  return { alimenti, nota: testo(corpo.nota, 200) };
}

/** Le kcal che i macro dichiarano, secondo Atwater: 4, 4 e 9 per grammo. */
export function kcalDaMacro(item: Pick<AlimentoStimato, "carbs" | "protein" | "fat">): number {
  return item.carbs * 4 + item.protein * 4 + item.fat * 9;
}

/**
 * Se le calorie dichiarate non tornano con i macro dichiarati.
 *
 * E' il controllo piu' utile che possiamo fare su una stima senza rifarla:
 * quando un modello sbaglia un numero, di solito sbaglia quello, e la somma
 * smette di quadrare. Non lo correggiamo da soli -- non sapremmo quale dei
 * due e' sbagliato -- ma lo diciamo, cosi' quel numero lo guardi prima di
 * salvarlo.
 *
 * La tolleranza e' larga: le tabelle nutrizionali vere non tornano quasi mai
 * al grammo, per via di fibre e alcol che Atwater conta diversamente.
 */
export function stimaIncoerente(item: AlimentoStimato): boolean {
  const attese = kcalDaMacro(item);
  const scarto = Math.abs(attese - item.kcal);
  // Sotto le 30 kcal di differenza non vale la pena dire niente: su una mela
  // e' rumore di arrotondamento.
  if (scarto <= 30) return false;
  const base = Math.max(attese, item.kcal);
  return base > 0 && scarto / base > 0.2;
}

/**
 * I cibi rapidi da allegare al prompt, come riferimento.
 *
 * Non e' un dettaglio: se in archivio c'e' gia' "Fette biscottate" con i
 * valori letti sulla confezione, quei numeri sono veri e vanno riusati.
 * Stimare da capo qualcosa che sappiamo gia' e' l'unico modo sicuro per
 * ottenere due numeri diversi per la stessa cosa.
 */
export function riferimentiPerModello(foods: QuickFood[]): string {
  if (foods.length === 0) return "";

  const righe = foods.map((food) => {
    const porzione = food.portion ? ` (${food.portion})` : "";
    return `- ${food.name}${porzione}: ${food.kcal} kcal, C ${food.carbs} g, P ${food.protein} g, G ${food.fat} g`;
  });

  return [
    "Questi alimenti sono già in archivio con i valori letti sulle confezioni.",
    "Se il testo ne nomina uno, usa esattamente questi numeri invece di stimarli,",
    "riscalandoli se la quantità è diversa.",
    "",
    ...righe,
  ].join("\n");
}
