"use client";

import {
  aggiungi,
  caricaInAttesa,
  salvaInAttesa,
  togli,
  type PastoInAttesa,
} from "./pasti-in-attesa";

/**
 * La coda dei pasti in attesa, condivisa fra i componenti.
 *
 * E' un negozio esterno letto con `useSyncExternalStore` e non uno stato in un
 * effetto: React 19 non vuole `setState` nel corpo di un effetto, e questo
 * dato esiste comunque fuori da React -- sta nella memoria del telefono e
 * sopravvive alla chiusura della pagina.
 *
 * Gemello di `pending-store.ts`, che fa lo stesso per le serie.
 */

const VUOTA: PastoInAttesa[] = [];

// Il modulo gira anche sul server durante il rendering: li' non c'e' memoria
// da leggere, e la coda parte vuota.
let cache: PastoInAttesa[] =
  typeof window === "undefined" ? VUOTA : caricaInAttesa();

const ascoltatori = new Set<() => void>();

function avvisa() {
  for (const ascoltatore of ascoltatori) ascoltatore();
}

export function subscribe(ascoltatore: () => void): () => void {
  ascoltatori.add(ascoltatore);
  return () => ascoltatori.delete(ascoltatore);
}

export function getSnapshot(): PastoInAttesa[] {
  return cache;
}

/** Durante l'idratazione la coda e' vuota: la memoria del telefono non c'e'. */
export function getServerSnapshot(): PastoInAttesa[] {
  return VUOTA;
}

export function accoda(pasto: PastoInAttesa): void {
  const prossima = aggiungi(cache, pasto);
  if (prossima.length === cache.length && cache.length > 0) return;
  cache = prossima;
  salvaInAttesa(cache);
  avvisa();
}

export function scoda(clientId: string): void {
  const prossima = togli(cache, clientId);
  if (prossima.length === cache.length) return;
  cache = prossima;
  salvaInAttesa(cache);
  avvisa();
}

export type EsitoInvio = { ok: true } | { ok: false; error: string };

// Un solo svuotamento alla volta: `online` e il montaggio possono partire
// insieme, e due invii dello stesso pasto sono inutili.
let svuotamentoInCorso = false;

/**
 * Prova a mandare tutti i pasti in coda, nell'ordine in cui li hai
 * registrati. Si ferma al primo errore: se la rete non c'e', non c'e' per
 * nessuno, e insistere consuma solo batteria.
 *
 * Restituisce quanti ne sono passati.
 */
export async function svuota(
  invia: (pasto: PastoInAttesa) => Promise<EsitoInvio>
): Promise<number> {
  if (svuotamentoInCorso) return 0;
  svuotamentoInCorso = true;

  let inviati = 0;
  try {
    for (const pasto of [...cache].sort((a, b) => a.savedAt - b.savedAt)) {
      const esito = await invia(pasto);
      if (!esito.ok) break;
      scoda(pasto.clientId);
      inviati += 1;
    }
  } finally {
    svuotamentoInCorso = false;
  }
  return inviati;
}
