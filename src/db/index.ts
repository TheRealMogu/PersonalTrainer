import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof build>;

function build() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL non impostata. In locale: copia .env.example in .env.local e inserisci la connection string di Neon. Su Vercel: Settings → Environment Variables.",
    );
  }

  return drizzle(neon(connectionString), { schema });
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
