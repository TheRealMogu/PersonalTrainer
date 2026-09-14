/**
 * Classificazione degli errori del database.
 *
 * Serve perche' in produzione Next nasconde il messaggio vero agli error
 * boundary lato client: arriva solo un digest, cioe' un numero. Se vogliamo
 * dire all'utente cosa e' successo dobbiamo riconoscerlo sul server, dove il
 * messaggio c'e' ancora.
 *
 * Il caso "schema" e' successo davvero: il database era indietro con le
 * migration e l'app rispondeva "A server error occurred" con un codice, che
 * non dice niente a nessuno.
 */

export type DbErrorKind = "schema" | "rete" | "configurazione" | "sconosciuto";

/** Codici SQLSTATE che significano "il database non ha quello che il codice si aspetta". */
const SCHEMA_CODES = new Set([
  "42703", // undefined_column
  "42P01", // undefined_table
  "42704", // undefined_object: tipicamente un tipo enum mai creato
  "3F000", // invalid_schema_name
]);

const NETWORK_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"]);

/** Scorre la catena delle cause: drizzle incarta l'errore del driver. */
function chain(error: unknown): unknown[] {
  const out: unknown[] = [];
  let current = error;
  // Il limite evita di girare all'infinito su una catena che si auto-riferisce.
  for (let i = 0; i < 10 && current != null; i += 1) {
    out.push(current);
    current = (current as { cause?: unknown }).cause;
  }
  return out;
}

function codeOf(error: unknown): string | null {
  const code = (error as { code?: unknown })?.code;
  return typeof code === "string" ? code : null;
}

function messageOf(error: unknown): string {
  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" ? message : "";
}

export function classifyDbError(error: unknown): DbErrorKind {
  const links = chain(error);

  for (const link of links) {
    const code = codeOf(link);
    if (code && SCHEMA_CODES.has(code)) return "schema";
  }

  for (const link of links) {
    const code = codeOf(link);
    if (code && NETWORK_CODES.has(code)) return "rete";
    // Neon passa da fetch: quando il server non risponde il messaggio e'
    // questo, senza nessun codice utile.
    if (/fetch failed|network|timeout|socket hang up/i.test(messageOf(link))) return "rete";
  }

  for (const link of links) {
    if (/DATABASE_URL non impostata|not a valid URL/i.test(messageOf(link))) {
      return "configurazione";
    }
  }

  return "sconosciuto";
}

export type DbErrorText = {
  title: string;
  body: string;
  hint?: string;
  /** Comando da lanciare, tenuto separato perche' va scritto come codice. */
  command?: string;
};

/** Titolo e spiegazione, in italiano, di cosa fare. */
export function describeDbError(kind: DbErrorKind): DbErrorText {
  switch (kind) {
    case "schema":
      return {
        title: "Il database è indietro",
        body:
          "L'app cerca dei dati che sul database non ci sono ancora: manca un aggiornamento della struttura.",
        hint: "Si ripara lanciando questo comando dal computer, non da qui:",
        command: "npm run db:migrate",
      };
    case "rete":
      return {
        title: "Non riesco a raggiungere il database",
        body:
          "Il server non ha risposto. Può essere la connessione, oppure il database in pausa: quello gratuito di Neon si sospende quando non lo usi e ci mette qualche secondo a svegliarsi.",
        hint: "Di solito basta riprovare fra qualche secondo.",
      };
    case "configurazione":
      return {
        title: "L'app non è configurata",
        body: "Manca l'indirizzo del database, oppure è scritto male.",
        hint: "Va impostata la variabile DATABASE_URL e rifatto il deploy.",
        command: undefined,
      };
    default:
      return {
        title: "Qualcosa è andato storto",
        body: "Non sono riuscito a caricare i dati. Non hai perso niente: è solo questa pagina.",
      };
  }
}
