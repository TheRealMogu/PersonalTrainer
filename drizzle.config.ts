import { defineConfig } from "drizzle-kit";
import "./scripts/load-env";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL non impostata: copia .env.example in .env.local");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
