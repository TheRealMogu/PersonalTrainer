/**
 * Caricare la prescrizione a settimane di un blocco: ripetizioni e carico che
 * il PT da' per ogni esercizio, settimana per settimana.
 *
 * Stesso giro di *Cambia la scheda*: l'app da' il prompt, tu dai il
 * documento del PT a una chat, riporti indietro la risposta, guardi cosa
 * cambia e confermi. Piu' semplice di *Cambia la scheda* perche' qui gli
 * esercizi non cambiano -- solo i numeri che ci stanno sopra -- quindi non
 * c'e' niente da archiviare: un esercizio del blocco nuovo deve chiamarsi
 * esattamente come quello di adesso, o non trova a chi appartenere.
 *
 * Raggruppato per giornata come `scheda.ts`, e non una lista piatta di nomi:
 * lo stesso esercizio torna su piu' giornate ("Spinte manubri panca piana" e'
 * sia il Day 1 sia il Day 3, con numeri diversi), e abbinare per solo nome
 * avrebbe scritto quelli del Day 1 anche sul Day 3.
 */

export const MAX_GIORNATE = 14;
export const MAX_ESERCIZI_PER_GIORNATA = 30;
export const MAX_SETTIMANE_PER_ESERCIZIO = 12;
export const MAX_TESTO = 20_000;
/** Tetto largo: ferma un incolla andato storto (un migliaio di kg), non giudica un carico vero. */
export const MAX_PESO = 500;

export type SettimanaProposta = {
  settimana: number;
  ripetizioni: string;
  peso: number;
};

export type EsercizioSettimane = {
  nome: string;
  settimane: SettimanaProposta[];
};

export type GiornataSettimane = {
  etichetta: string;
  esercizi: EsercizioSettimane[];
};

export type EsitoLetturaSettimane =
  | { ok: true; giornate: GiornataSettimane[] }
  | { ok: false; errore: string };

/** Come sono adesso le giornate, per costruire il prompt e per l'abbinamento. */
export type GiornataAttuale = {
  etichetta: string;
  esercizi: { id: number; name: string }[];
};

/**
 * Il prompt da copiare in chat, con le giornate e i nomi esatti di adesso:
 * un nome diverso per lo stesso esercizio (qui o nella risposta) e quella
 * riga non trova a chi appartenere, e resta fuori senza dirlo in giro --
 * per questo elencarli e' la parte che conta.
 */
export function promptPerSettimane(attuali: GiornataAttuale[]): string {
  const scheda = attuali
    .map(
      (g) =>
        `${g.etichetta}\n` + g.esercizi.map((e) => `  ${e.name}`).join("\n"),
    )
    .join("\n\n");

  return [
    "Ti mando la programmazione a settimane che mi ha dato il personal trainer",
    "(di solito un PDF con più settimane per esercizio: ripetizioni e carico,",
    "una pagina per giornata).",
    "Riscrivimela in JSON, esattamente in questo formato e senza altro testo intorno:",
    "",
    '{"giornate":[{"etichetta":"Day 1","esercizi":[{"nome":"Panca piana","settimane":[{"settimana":1,"ripetizioni":"8-10","peso":40},{"settimana":2,"ripetizioni":"8","peso":42.5}]}]}]}',
    "",
    "Regole:",
    '- "ripetizioni" è testo libero, come sta scritto sul documento: "8-10", "7", "8-7-7-7".',
    '- "peso" è sempre un numero in kg, con il punto se serve il decimale (40.5, non 40,5).',
    "- L'etichetta della giornata e il nome di ogni esercizio devono essere identici,",
    "  lettera per lettera, a come stanno scritti qui sotto — lo stesso esercizio torna",
    "  su più giornate con numeri diversi, e la giornata è quella che li distingue.",
    "- Non inventare giornate o esercizi che non sono in questo elenco.",
    "- Le settimane vanno nell'ordine in cui il PT le scrive (di solito 1, 2, 3…).",
    "",
    attuali.length > 0
      ? `Le giornate di adesso sono queste:\n\n${scheda}`
      : "Adesso non ho nessuna giornata.",
  ].join("\n");
}

/**
 * Legge la risposta incollata. Stessa tolleranza di `leggiScheda`: il JSON
 * può arrivare dentro un blocco di codice o con del testo intorno, perché
 * una chat quasi sempre ne aggiunge.
 */
export function leggiSettimane(testo: string): EsitoLetturaSettimane {
  if (testo.trim() === "")
    return { ok: false, errore: "Non hai incollato niente." };
  if (testo.length > MAX_TESTO) {
    return {
      ok: false,
      errore: "Il testo è troppo lungo: incolla solo la risposta.",
    };
  }

  const json = estraiJson(testo);
  if (json === null) {
    return {
      ok: false,
      errore: "Non ho trovato il JSON. Incolla la risposta della chat com'è.",
    };
  }

  let dati: unknown;
  try {
    dati = JSON.parse(json);
  } catch {
    return {
      ok: false,
      errore: "Il JSON non è valido: manca o avanza qualcosa.",
    };
  }

  const giornateGrezze = (dati as { giornate?: unknown })?.giornate;
  if (!Array.isArray(giornateGrezze)) {
    return { ok: false, errore: 'Manca la lista "giornate".' };
  }
  if (giornateGrezze.length === 0) {
    return { ok: false, errore: "Non c'è nessuna giornata." };
  }
  if (giornateGrezze.length > MAX_GIORNATE) {
    return {
      ok: false,
      errore: `Troppe giornate: il massimo è ${MAX_GIORNATE}.`,
    };
  }

  const giornate: GiornataSettimane[] = [];
  for (const grezza of giornateGrezze) {
    const g = grezza as Record<string, unknown>;
    const dove = testoBreve(g.etichetta);
    if (!dove) return { ok: false, errore: "Una giornata è senza etichetta." };

    if (!Array.isArray(g.esercizi) || g.esercizi.length === 0) {
      return { ok: false, errore: `${dove}: non ha esercizi.` };
    }
    if (g.esercizi.length > MAX_ESERCIZI_PER_GIORNATA) {
      return {
        ok: false,
        errore: `${dove}: troppi esercizi, il massimo è ${MAX_ESERCIZI_PER_GIORNATA}.`,
      };
    }

    const esercizi: EsercizioSettimane[] = [];
    for (const grezzo of g.esercizi as unknown[]) {
      const e = grezzo as Record<string, unknown>;
      const nome = testoBreve(e.nome);
      if (!nome)
        return { ok: false, errore: `${dove}: un esercizio è senza nome.` };

      if (!Array.isArray(e.settimane) || e.settimane.length === 0) {
        return {
          ok: false,
          errore: `${dove} — ${nome}: non ha nessuna settimana.`,
        };
      }
      if (e.settimane.length > MAX_SETTIMANE_PER_ESERCIZIO) {
        return {
          ok: false,
          errore: `${dove} — ${nome}: troppe settimane, il massimo è ${MAX_SETTIMANE_PER_ESERCIZIO}.`,
        };
      }

      const settimane: SettimanaProposta[] = [];
      for (const s of e.settimane as unknown[]) {
        const riga = s as Record<string, unknown>;
        const settimana = Number(riga.settimana);
        if (!Number.isInteger(settimana) || settimana < 1) {
          return {
            ok: false,
            errore: `${dove} — ${nome}: la settimana deve essere un numero da 1 in su.`,
          };
        }
        const ripetizioni = testoBreve(riga.ripetizioni);
        if (!ripetizioni) {
          return {
            ok: false,
            errore: `${dove} — ${nome}, settimana ${settimana}: mancano le ripetizioni.`,
          };
        }
        const peso = Number(riga.peso);
        if (!Number.isFinite(peso) || peso <= 0 || peso > MAX_PESO) {
          return {
            ok: false,
            errore: `${dove} — ${nome}, settimana ${settimana}: il carico deve stare fra 0 e ${MAX_PESO} kg.`,
          };
        }
        settimane.push({ settimana, ripetizioni, peso });
      }

      esercizi.push({ nome, settimane });
    }

    giornate.push({ etichetta: dove, esercizi });
  }

  return { ok: true, giornate };
}

function testoBreve(valore: unknown): string | null {
  if (typeof valore === "number") return String(valore);
  if (typeof valore !== "string") return null;
  const pulito = valore.trim();
  if (!pulito || pulito.length > 120) return null;
  return pulito;
}

function estraiJson(testo: string): string | null {
  const inBlocco = testo.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidato = inBlocco ? inBlocco[1] : testo;
  const inizio = candidato.indexOf("{");
  const fine = candidato.lastIndexOf("}");
  if (inizio === -1 || fine <= inizio) return null;
  return candidato.slice(inizio, fine + 1);
}

/**
 * Due nomi sono la stessa cosa? Stessa regola di `scheda.ts` (`stessaCosa`):
 * ignora maiuscole, accenti e spazi doppi.
 */
export function stessaCosa(a: string, b: string): boolean {
  return normalizza(a) === normalizza(b);
}

function normalizza(testo: string): string {
  return testo
    .trim()
    .toLocaleLowerCase("it")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

export type AbbinamentoSettimane = {
  id: number;
  nome: string;
  dayLabel: string;
  settimane: SettimanaProposta[];
};

export type ConfrontoSettimane = {
  trovati: AbbinamentoSettimane[];
  /** "Day 1 — Panca piana": giornata ed esercizio incollati che non corrispondono a niente di adesso. */
  nonTrovati: string[];
};

/**
 * Abbina giornata per giornata, poi esercizio per esercizio dentro quella
 * giornata: e' quello che evita di scrivere sul Day 3 i numeri che il PT ha
 * dato per lo stesso esercizio nel Day 1. Non cambia niente: dice solo cosa
 * si aggiornerebbe e cosa resterebbe fuori, cosi' un nome o una giornata
 * scritti un po' diversi si vedono prima di applicare, non dopo.
 */
export function confrontaSettimane(
  attuali: GiornataAttuale[],
  proposta: GiornataSettimane[],
): ConfrontoSettimane {
  const trovati: AbbinamentoSettimane[] = [];
  const nonTrovati: string[] = [];

  for (const giornata of proposta) {
    const giornataAttuale = attuali.find((g) =>
      stessaCosa(g.etichetta, giornata.etichetta),
    );

    for (const esercizio of giornata.esercizi) {
      const attuale = giornataAttuale?.esercizi.find((e) =>
        stessaCosa(e.name, esercizio.nome),
      );
      if (!attuale) {
        nonTrovati.push(`${giornata.etichetta} — ${esercizio.nome}`);
        continue;
      }
      trovati.push({
        id: attuale.id,
        nome: attuale.name,
        dayLabel: giornataAttuale!.etichetta,
        settimane: [...esercizio.settimane].sort(
          (a, b) => a.settimana - b.settimana,
        ),
      });
    }
  }

  return { trovati, nonTrovati };
}
