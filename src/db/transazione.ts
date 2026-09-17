import { db } from "./index";

/**
 * Esegue tutte le istruzioni in una transazione sola: o passano tutte, o
 * nessuna.
 *
 * Serve un adattatore perche' i due driver non hanno lo stesso attrezzo.
 *
 * - `neon-http`, quello di produzione, **non ha** `db.transaction()`: lancia
 *   "No transactions support in neon-http driver". Ha pero' `db.batch()`, che
 *   manda tutte le istruzioni in un'unica transazione sul server.
 * - `node-postgres`, quello che si usa per provare in locale, ha
 *   `db.transaction()` e **non ha** `batch`.
 *
 * Le istruzioni si costruiscono dentro la funzione che si passa qui, non
 * fuori. Non e' un dettaglio: una query drizzle si porta dietro l'esecutore
 * su cui e' stata costruita, quindi una costruita su `db` e awaitata dentro
 * una transazione `node-postgres` finirebbe su **un'altra connessione del
 * pool** -- fuori dalla transazione, senza dire niente. Costruendole
 * sull'esecutore che arriva come argomento, sono davvero atomiche su
 * entrambi i driver.
 *
 * Il motivo per cui l'atomicita' serve: un cambio scheda interrotto a meta'
 * lascerebbe un programma mezzo vecchio e mezzo nuovo, che e' esattamente la
 * sporcizia che tutto questo giro esiste per evitare.
 */
export async function inTransazione(
  costruisci: (esecutore: typeof db) => unknown[],
): Promise<void> {
  const client = db as unknown as {
    batch?: (q: unknown[]) => Promise<unknown>;
    transaction?: (fn: (tx: typeof db) => Promise<void>) => Promise<void>;
  };

  if (typeof client.batch === "function") {
    const istruzioni = costruisci(db);
    if (istruzioni.length === 0) return;
    await client.batch(istruzioni);
    return;
  }

  if (typeof client.transaction === "function") {
    await client.transaction(async (tx) => {
      for (const istruzione of costruisci(tx)) {
        await (istruzione as Promise<unknown>);
      }
    });
    return;
  }

  throw new Error("Nessun modo di aprire una transazione con questo driver.");
}
