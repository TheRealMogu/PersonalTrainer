import { createRequire } from "node:module";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof build>;

/**
 * Se la connection string punta a Neon.
 *
 * Neon si raggiunge in HTTP, un Postgres normale no: sono due driver diversi
 * e non c'e' modo di indovinarlo a runtime se non dall'indirizzo. Si guarda
 * l'host e non tutta la stringa, cosi' una password che per caso contiene
 * "neon" non fa scegliere il driver sbagliato.
 */
function eNeon(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname;
    return /\.neon\.tech$/i.test(host) || /neon/i.test(host);
  } catch {
    return true;
  }
}

/**
 * Il driver si sceglie dall'indirizzo, invece di scambiare questo file a mano.
 *
 * In produzione e' sempre Neon. Ma per provare davvero qualcosa serve un
 * database, e questo ambiente Neon non la raggiunge: serviva un Postgres
 * normale, e finora voleva dire riscrivere questo file prima di ogni prova e
 * ricordarsi di rimetterlo a posto dopo. Una cosa da ricordarsi prima o poi
 * la si dimentica, e quella volta il driver di prova finisce in produzione.
 *
 * Adesso lo decide l'indirizzo, che e' un dato e non una modifica al codice.
 * E' anche quello che permette alla CI di far girare le prove col browser
 * contro un Postgres vero.
 */
function build() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL non impostata. In locale: copia .env.example in .env.local e inserisci la connection string di Neon. Su Vercel: Settings → Environment Variables.",
    );
  }

  if (eNeon(connectionString)) {
    return drizzle(neon(connectionString), { schema });
  }

  /*
   * `require` e non `import`: cosi' `pg` non entra nel bundle di produzione,
   * dove non serve e non c'e'. E' una dipendenza di sviluppo, e in produzione
   * questo ramo non viene mai preso.
   */
  const richiedi = createRequire(import.meta.url);
  const { Pool } = richiedi("pg") as typeof import("pg");
  const { drizzle: drizzlePg } = richiedi("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
  return drizzlePg(new Pool({ connectionString }), { schema }) as unknown as ReturnType<
    typeof drizzle<typeof schema>
  >;
}

let cached: Db | null = null;

function connection(): Db {
  if (!cached) cached = build();
  return cached;
}

/**
 * Il collegamento si apre alla prima query, non quando il file viene
 * importato. Serve perche' `next build` importa ogni pagina per leggerne la
 * configurazione: se qui dentro si lanciasse un errore subito, una variabile
 * mancante non farebbe fallire una richiesta -- farebbe fallire la build
 * intera, con un messaggio che parla di una pagina a caso. Cosi' invece
 * l'errore arriva dove serve, nel momento in cui si prova davvero a leggere
 * il database.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = connection();
    const value = Reflect.get(real, prop);
    // I metodi vanno legati all'oggetto vero: se `this` restasse il proxy,
    // drizzle leggerebbe il proprio stato interno passando da qui.
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_target, prop) {
    return Reflect.has(connection(), prop);
  },
}) as Db;

export { schema };
