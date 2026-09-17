/**
 * Cambiare la scheda di allenamento senza perdere lo storico.
 *
 * Stesso giro di *Incolla da Claude*, applicato al programma invece che a un
 * pasto: l'app da' il formato, tu dai i documenti del personal trainer a una
 * chat, riporti indietro la risposta, **guardi cosa cambia** e confermi.
 *
 * Cambia pero' la posta in gioco. Un pasto sbagliato e' un pasto; una scheda
 * sbagliata sono mesi di carichi. Per questo qui niente si cancella: quello
 * che esce dal programma viene archiviato, e resta leggibile.
 *
 * Questo modulo non tocca il database: legge, confronta e dice cosa
 * succederebbe. Cosi' il confronto si puo' provare senza Postgres davanti.
 */

/** Tetti larghi: fermano un incolla andato storto, non giudicano una scheda. */
export const MAX_GIORNATE = 14;
export const MAX_ESERCIZI_PER_GIORNATA = 30;
export const MAX_SERIE = 20;
export const MAX_TESTO_SCHEDA = 20_000;

export type EsercizioProposto = {
  nome: string;
  serie: number;
  ripetizioni: string;
};

export type GiornataProposta = {
  etichetta: string;
  focus: string;
  esercizi: EsercizioProposto[];
};

/** Com'e' la scheda adesso, come serve per confrontarla. */
export type GiornataAttuale = {
  id: number;
  label: string;
  focus: string;
  esercizi: {
    id: number;
    name: string;
    sets: number;
    reps: string;
    /** Quante serie hai gia' registrato su questo esercizio. */
    serieRegistrate: number;
  }[];
};

/**
 * Il prompt da copiare in chat.
 *
 * Si porta dietro la scheda com'e' adesso: cosi' chi legge sa cosa sta
 * sostituendo e puo' lasciare uguale quello che non cambia, invece di
 * reinventare i nomi -- e un nome reinventato qui vuol dire un esercizio
 * archiviato e uno nuovo al posto suo, cioe' una progressione spezzata in due.
 */
export function promptPerScheda(attuale: GiornataAttuale[]): string {
  const scheda = attuale
    .map(
      (g) =>
        `${g.label} — ${g.focus}\n` +
        g.esercizi.map((e) => `  ${e.name}: ${e.sets}×${e.reps}`).join("\n")
    )
    .join("\n\n");

  return [
    "Ti mando la scheda di allenamento che mi ha dato il personal trainer.",
    "Riscrivimela in JSON, esattamente in questo formato e senza altro testo intorno:",
    "",
    '{"giornate":[{"etichetta":"Day 1","focus":"Petto e tricipiti","esercizi":[{"nome":"Panca piana","serie":4,"ripetizioni":"8-10"}]}]}',
    "",
    "Regole:",
    '- "ripetizioni" è testo libero: "8-10", "12", "cedimento", come sta scritto sulla scheda.',
    "- Se un esercizio c'è già nella scheda qui sotto e non cambia, scrivilo con lo stesso identico nome.",
    "  Un nome diverso per lo stesso esercizio spezza in due lo storico dei carichi.",
    "- Non inventare esercizi che non ci sono nei documenti che ti do.",
    "- Le giornate vanno nell'ordine in cui si fanno.",
    "",
    attuale.length > 0
      ? `La scheda di adesso è questa:\n\n${scheda}`
      : "Adesso non ho nessuna scheda.",
  ].join("\n");
}

export type EsitoLettura =
  | { ok: true; giornate: GiornataProposta[] }
  | { ok: false; errore: string };

/**
 * Legge la risposta incollata.
 *
 * Accetta il JSON anche dentro un blocco di codice o con del testo intorno,
 * perche' una chat quasi sempre ne aggiunge. Quello che arriva da fuori e'
 * testo, non istruzioni: si valida tutto prima di farne qualcosa.
 */
export function leggiScheda(testo: string): EsitoLettura {
  if (testo.trim() === "")
    return { ok: false, errore: "Non hai incollato niente." };
  if (testo.length > MAX_TESTO_SCHEDA) {
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
    return {
      ok: false,
      errore: "La scheda è vuota: non c'è nessuna giornata.",
    };
  }
  if (giornateGrezze.length > MAX_GIORNATE) {
    return {
      ok: false,
      errore: `Troppe giornate: il massimo è ${MAX_GIORNATE}.`,
    };
  }

  const giornate: GiornataProposta[] = [];
  for (const [indice, grezza] of giornateGrezze.entries()) {
    const dove = `Giornata ${indice + 1}`;
    const g = grezza as Record<string, unknown>;

    const etichetta = testoBreve(g.etichetta);
    if (!etichetta) return { ok: false, errore: `${dove}: manca l'etichetta.` };
    const focus = testoBreve(g.focus) ?? "";

    if (!Array.isArray(g.esercizi) || g.esercizi.length === 0) {
      return { ok: false, errore: `${dove} (${etichetta}): non ha esercizi.` };
    }
    if (g.esercizi.length > MAX_ESERCIZI_PER_GIORNATA) {
      return {
        ok: false,
        errore: `${dove} (${etichetta}): troppi esercizi, il massimo è ${MAX_ESERCIZI_PER_GIORNATA}.`,
      };
    }

    const esercizi: EsercizioProposto[] = [];
    for (const grezzo of g.esercizi as unknown[]) {
      const e = grezzo as Record<string, unknown>;
      const nome = testoBreve(e.nome);
      if (!nome)
        return {
          ok: false,
          errore: `${etichetta}: un esercizio è senza nome.`,
        };

      const serie = Number(e.serie);
      if (!Number.isInteger(serie) || serie < 1 || serie > MAX_SERIE) {
        return {
          ok: false,
          errore: `${etichetta} — ${nome}: le serie devono stare fra 1 e ${MAX_SERIE}.`,
        };
      }

      const ripetizioni = testoBreve(e.ripetizioni);
      if (!ripetizioni) {
        return {
          ok: false,
          errore: `${etichetta} — ${nome}: mancano le ripetizioni.`,
        };
      }

      esercizi.push({ nome, serie, ripetizioni });
    }

    giornate.push({ etichetta, focus, esercizi });
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

/** Il JSON puo' arrivare dentro un blocco di codice o con del testo intorno. */
function estraiJson(testo: string): string | null {
  const inBlocco = testo.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidato = inBlocco ? inBlocco[1] : testo;
  const inizio = candidato.indexOf("{");
  const fine = candidato.lastIndexOf("}");
  if (inizio === -1 || fine <= inizio) return null;
  return candidato.slice(inizio, fine + 1);
}

/**
 * Due nomi sono lo stesso esercizio?
 *
 * Si confronta ignorando maiuscole, accenti e spazi doppi: "Panca Piana" e
 * "panca piana" sono lo stesso esercizio, e trattarli come due spezzerebbe in
 * due la progressione per una maiuscola.
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

export type CambioEsercizio = {
  nome: string;
  giornata: string;
  /** Com'era. Assente se l'esercizio e' nuovo. */
  prima?: { serie: number; ripetizioni: string };
  /** Come diventa. Assente se esce dal programma. */
  dopo?: { serie: number; ripetizioni: string };
  /** Quante serie hai registrato: quanto storico stai mettendo da parte. */
  serieRegistrate?: number;
};

export type Confronto = {
  uguali: CambioEsercizio[];
  cambiati: CambioEsercizio[];
  aggiunti: CambioEsercizio[];
  archiviati: CambioEsercizio[];
  /** Giornate che escono dal programma, per nome. */
  giornateArchiviate: string[];
  giornateAggiunte: string[];
  /** Serie registrate in totale su quello che esce: il numero che pesa. */
  serieDaArchiviare: number;
};

/**
 * Cosa cambierebbe, riga per riga, senza cambiare niente.
 *
 * Si guarda prima di scrivere, come per i pasti stimati: e' la stessa regola,
 * con in piu' che qui il danno di un errore non si ripara riscrivendo un
 * numero.
 */
export function confronta(
  attuale: GiornataAttuale[],
  proposta: GiornataProposta[]
): Confronto {
  const confronto: Confronto = {
    uguali: [],
    cambiati: [],
    aggiunti: [],
    archiviati: [],
    giornateArchiviate: [],
    giornateAggiunte: [],
    serieDaArchiviare: 0,
  };

  for (const giornata of attuale) {
    const nuova = proposta.find((g) => stessaCosa(g.etichetta, giornata.label));

    if (!nuova) {
      confronto.giornateArchiviate.push(giornata.label);
      for (const esercizio of giornata.esercizi) {
        confronto.archiviati.push({
          nome: esercizio.name,
          giornata: giornata.label,
          prima: { serie: esercizio.sets, ripetizioni: esercizio.reps },
          serieRegistrate: esercizio.serieRegistrate,
        });
        confronto.serieDaArchiviare += esercizio.serieRegistrate;
      }
      continue;
    }

    for (const esercizio of giornata.esercizi) {
      const proposto = nuova.esercizi.find((e) =>
        stessaCosa(e.nome, esercizio.name)
      );
      if (!proposto) {
        confronto.archiviati.push({
          nome: esercizio.name,
          giornata: giornata.label,
          prima: { serie: esercizio.sets, ripetizioni: esercizio.reps },
          serieRegistrate: esercizio.serieRegistrate,
        });
        confronto.serieDaArchiviare += esercizio.serieRegistrate;
        continue;
      }

      const voce: CambioEsercizio = {
        nome: esercizio.name,
        giornata: giornata.label,
        prima: { serie: esercizio.sets, ripetizioni: esercizio.reps },
        dopo: { serie: proposto.serie, ripetizioni: proposto.ripetizioni },
        serieRegistrate: esercizio.serieRegistrate,
      };

      const uguale =
        esercizio.sets === proposto.serie &&
        esercizio.reps === proposto.ripetizioni;
      (uguale ? confronto.uguali : confronto.cambiati).push(voce);
    }
  }

  for (const giornata of proposta) {
    const vecchia = attuale.find((g) =>
      stessaCosa(g.label, giornata.etichetta)
    );
    if (!vecchia) {
      confronto.giornateAggiunte.push(giornata.etichetta);
    }
    for (const esercizio of giornata.esercizi) {
      const giaPresente = vecchia?.esercizi.some((e) =>
        stessaCosa(e.name, esercizio.nome)
      );
      if (!giaPresente) {
        confronto.aggiunti.push({
          nome: esercizio.nome,
          giornata: giornata.etichetta,
          dopo: { serie: esercizio.serie, ripetizioni: esercizio.ripetizioni },
        });
      }
    }
  }

  return confronto;
}

/** Vero se applicare non cambierebbe niente: si dice, invece di far finta. */
export function nessunCambiamento(confronto: Confronto): boolean {
  return (
    confronto.cambiati.length === 0 &&
    confronto.aggiunti.length === 0 &&
    confronto.archiviati.length === 0 &&
    confronto.giornateArchiviate.length === 0 &&
    confronto.giornateAggiunte.length === 0
  );
}
