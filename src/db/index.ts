import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL non impostata. Copia .env.example in .env.local e inserisci la connection string di Neon.",
  );
}

export const db = drizzle(neon(connectionString), { schema });
export { schema };
