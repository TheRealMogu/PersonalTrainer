import type { QuickFood } from "@/db/schema";
import { isMealSlot, type MealSlot } from "./meal-slots";
import { normalizzaStima, riferimentiPerModello, type Stima } from "./stima-pasto";

/**
 * Quanto testo si accetta in un colpo. Un JSON con sei alimenti sta sotto i
 * mille caratteri; il tetto serve a fermare un incollaggio finito li' per
 * sbaglio, non a misurare la cena.
 */
export const MAX_INCOLLATO = 4000;

export type EsitoLettura = { ok: true; stima: Stima } | { ok: false; error: string };

/**
 * Lo scheletro che chiediamo a Claude di riempire.
 *
 * Vive qui, accanto a chi lo legge: un formato scritto in due posti diversi
 * diventa due formati diversi al primo ritocco.
 */
const SCHELETRO =
  '{"alimenti":[{"nome":"","porzione":"","momento":"colazione|pranzo|cena|spuntino","kcal":0,"carboidrati":0,"proteine":0,"grassi":0}]}';

/**
 * Il testo da incollare in Claude perche' risponda in un formato che questa
 * schermata sa leggere.
 *
 * Ci mettiamo dentro anche i cibi rapidi gia' in archivio: quelli hanno i
 * valori letti sulle confezioni, e ristimarli e' l'unico modo sicuro per
 * ritrovarsi due numeri diversi per la stessa cosa. Costa qualche riga in
 * piu' da copiare, e copiare e' un tocco solo.
 */
export function promptPerClaude(foods: QuickFood[]): string {
  const riferimenti = riferimentiPerModello(foods);

  return [
    "Leggi cosa ho mangiato e rispondi SOLO con questo JSON, senza altro testo:",
    "",
    SCHELETRO,
    "",
    "Regole: i valori sono totali per la porzione indicata, non per 100 g. Se non scrivo la quantità, usa la porzione tipica italiana e scrivila in \"porzione\". Le kcal devono tornare con i macro (4 per grammo di carboidrati e proteine, 9 per i grassi). Usa le tabelle CREA.",
    riferimenti ? "" : null,
    riferimenti || null,
    "",
    "Ho mangiato: ",
  ]
    .filter((riga): riga is string => riga !== null)
    .join("\n");
}

/** Accetta la virgola come separatore decimale, e i punti delle migliaia. */
function numero(grezzo: string): number | null {
  const pulito = grezzo.trim().replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const valore = Number(pulito);
  return Number.isFinite(valore) ? valore : null;
}

/** Toglie le staccionate di codice, che Claude mette quasi sempre. */
function senzaStaccionate(testo: string): string {
  return testo.replace(/^\s*```[a-z]*\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

/**
 * Il primo oggetto o elenco JSON dentro al testo.
 *
 * Si cerca per delimitatori invece di dare in pasto tutto: se Claude ha
 * scritto una riga di cortesia prima del JSON, buttare via la risposta
 * sarebbe scortese a nostra volta.
 */
function ritagliaJson(testo: string): string | null {
  const inizio = testo.search(/[{[]/);
  if (inizio === -1) return null;
  const apre = testo[inizio];
  const chiude = apre === "{" ? "}" : "]";
  const fine = testo.lastIndexOf(chiude);
  if (fine <= inizio) return null;
  return testo.slice(inizio, fine + 1);
}

function daJson(testo: string): unknown | null {
  const ritagliato = ritagliaJson(testo);
  if (!ritagliato) return null;
  try {
    const letto = JSON.parse(ritagliato);
    // Un elenco nudo va bene quanto l'oggetto: chiedere la busta e' una
    // formalita' che non aggiunge niente.
    return Array.isArray(letto) ? { alimenti: letto } : letto;
  } catch {
    return null;
  }
}

/** Le intestazioni che riconosciamo, e il campo a cui corrispondono. */
const COLONNE: [RegExp, string][] = [
  [/^(alimento|nome|cibo|voce)/i, "nome"],
  [/^(porzione|quantit|peso|dose)/i, "porzione"],
  [/^(momento|quando|pasto)/i, "momento"],
  [/^(kcal|calorie|energia)/i, "kcal"],
  [/^(carboidrati|carbo|c)\b/i, "carboidrati"],
  [/^(proteine|prot|p)\b/i, "proteine"],
  [/^(grassi|lipidi|g)\b/i, "grassi"],
];

function campoPerIntestazione(testo: string): string | null {
  const pulito = testo.replace(/\(.*?\)/g, "").trim();
  for (const [schema, campo] of COLONNE) {
    if (schema.test(pulito)) return campo;
  }
  return null;
}

const NUMERICI = new Set(["kcal", "carboidrati", "proteine", "grassi"]);

/**
 * Una tabella markdown, che e' quello che Claude produce se non gli si
 * chiede il JSON. Capita, e rifiutarla costerebbe un giro in piu' solo per
 * cambiare formato a qualcosa che si legge benissimo.
 */
function daTabella(testo: string): unknown | null {
  const righe = testo
    .split("\n")
    .map((riga) => riga.trim())
    .filter((riga) => riga.startsWith("|") && riga.endsWith("|"));
  if (righe.length < 2) return null;

  const celle = (riga: string) =>
    riga
      .slice(1, -1)
      .split("|")
      .map((cella) => cella.trim());

  const intestazione = celle(righe[0]).map(campoPerIntestazione);
  if (!intestazione.includes("nome") || !intestazione.includes("kcal")) return null;

  const alimenti: Record<string, unknown>[] = [];
  for (const riga of righe.slice(1)) {
    // La riga di trattini che separa l'intestazione non e' un alimento.
    if (/^\|[\s:|-]+\|$/.test(riga)) continue;
    const valori = celle(riga);
    const voce: Record<string, unknown> = {};
    intestazione.forEach((campo, indice) => {
      if (!campo) return;
      const grezzo = (valori[indice] ?? "").replace(/\*/g, "").trim();
      if (NUMERICI.has(campo)) {
        const valore = numero(grezzo.replace(/[^\d.,-]/g, ""));
        if (valore !== null) voce[campo] = valore;
      } else {
        voce[campo] = grezzo;
      }
    });
    if (voce.nome) alimenti.push(voce);
  }
  return alimenti.length > 0 ? { alimenti } : null;
}

/**
 * Un numero che comincia per forza con una cifra.
 *
 * `[\d.,]+` sembrava equivalente e non lo era: su "31 g, grassi 3,6" la
 * virgola dopo la "g" contava come numero, la lettura dava NaN, e i grassi
 * finivano a zero -- un macro perso in silenzio, che e' il modo peggiore di
 * sbagliare.
 */
const NUMERO = "(\\d+(?:[.,]\\d+)?)";

/**
 * Cerca "carboidrati: 38", "38 g di carboidrati", "C 38".
 *
 * In quest'ordine, e non e' indifferente: la sigla si prova per ultima
 * perche' una lettera sola pesca dappertutto. La sigla vuole i confini di
 * parola da tutte e due le parti, altrimenti la "p" di "porzione: 200"
 * diventerebbe duecento grammi di proteine.
 */
function macro(riga: string, breve: string, esteso: RegExp): number | null {
  const tentativi = [
    new RegExp(`(?:${esteso.source})\\s*[:=]?\\s*${NUMERO}`, "i"),
    new RegExp(`${NUMERO}\\s*g?\\s*(?:di\\s+)?(?:${esteso.source})`, "i"),
    new RegExp(`\\b${breve}\\b\\s*[:=]?\\s*${NUMERO}`, "i"),
  ];
  for (const schema of tentativi) {
    const trovato = riga.match(schema);
    // Uno schema che aggancia ma non da' un numero usabile non chiude la
    // ricerca: si passa al successivo.
    if (trovato) {
      const valore = numero(trovato[1]);
      if (valore !== null) return valore;
    }
  }
  return null;
}

/**
 * Righe scritte a mano: "Pane integrale (80 g): 194 kcal, C 38, P 7, G 1,6".
 *
 * L'ultima spiaggia, ed e' quella che si usa quando si scrive di fretta.
 */
function daRighe(testo: string): unknown | null {
  const alimenti: Record<string, unknown>[] = [];

  for (const grezza of testo.split("\n")) {
    const riga = grezza.replace(/^[\s*\-•\d.)]+/, "").trim();
    if (!riga) continue;

    const calorie = riga.match(new RegExp(`${NUMERO}\\s*k?cal`, "i"));
    if (!calorie) continue;
    const kcal = numero(calorie[1]);
    if (kcal === null) continue;

    // Il nome e' quello che viene prima delle calorie, senza l'etichetta del
    // momento: "Cena: risotto" e' un risotto, la cena la mettiamo nel campo
    // apposta.
    const nome = riga
      .slice(0, calorie.index)
      .replace(/^(colazione|pranzo|cena|spuntino)\s*[:\-–—]\s*/i, "")
      .replace(/[\s:;,.\-–—]+$/, "")
      .trim();
    if (!nome) continue;

    const porzione = nome.match(/\((.*?)\)\s*$/);
    const voce: Record<string, unknown> = {
      nome: porzione ? nome.slice(0, porzione.index).trim() : nome,
      porzione: porzione ? porzione[1] : "",
      kcal,
      carboidrati: macro(riga, "c", /carboidrati|carbo/) ?? 0,
      proteine: macro(riga, "p", /proteine|prot/) ?? 0,
      grassi: macro(riga, "g", /grassi|lipidi/) ?? 0,
    };

    const momento = riga.toLowerCase().match(/colazione|pranzo|cena|spuntino/);
    if (momento && isMealSlot(momento[0])) voce.momento = momento[0];

    alimenti.push(voce);
  }

  return alimenti.length > 0 ? { alimenti } : null;
}

/**
 * Legge quello che hai incollato, in qualunque dei modi in cui puo' arrivare.
 *
 * Tutto quello che entra da qui e' input non fidato: viene da una finestra di
 * chat, passa dagli appunti, e puo' essere qualunque cosa. Non lo si usa mai
 * direttamente -- si fa passare da `normalizzaStima`, che e' l'unico punto in
 * cui un numero diventa accettabile.
 */
export function leggiIncollato(testo: string, slotPredefinito: MealSlot): EsitoLettura {
  const pulito = senzaStaccionate(testo);
  if (!pulito) return { ok: false, error: "Non hai incollato niente." };
  if (pulito.length > MAX_INCOLLATO) {
    return { ok: false, error: `Testo troppo lungo: massimo ${MAX_INCOLLATO} caratteri.` };
  }

  const grezzo = daJson(pulito) ?? daTabella(pulito) ?? daRighe(pulito);
  if (grezzo === null) {
    return {
      ok: false,
      error:
        "Non ho riconosciuto il formato. Copia il prompt qui sotto, incollalo in Claude insieme a cosa hai mangiato, e riporta qui la sua risposta.",
    };
  }

  const stima = normalizzaStima(grezzo, slotPredefinito);
  if (stima.alimenti.length === 0) {
    return {
      ok: false,
      error:
        "Ho letto il testo ma nessuna riga aveva un nome e dei numeri utilizzabili. Controlla che ci siano le calorie.",
    };
  }
  return { ok: true, stima };
}
