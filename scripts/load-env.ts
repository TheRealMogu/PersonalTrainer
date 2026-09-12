import { config } from "dotenv";

/**
 * Carica le variabili come fa Next, che legge `.env.local` per primo.
 * `dotenv/config` da solo guarda solo `.env`: senza questo, gli script da
 * riga di comando non vedrebbero il file indicato dal README.
 * Il primo file che definisce una variabile vince.
 */
config({ path: [".env.local", ".env"], quiet: true });
