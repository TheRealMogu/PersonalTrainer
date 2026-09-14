"use client";

import {
  addPending,
  loadPending,
  removePending,
  savePending,
  type PendingSet,
} from "./pending-sets";

/**
 * La coda delle serie in attesa, condivisa fra i componenti.
 *
 * E' un negozio esterno letto con `useSyncExternalStore` e non uno stato in
 * un effetto: React 19 non vuole `setState` nel corpo di un effetto, e questo
 * dato esiste comunque fuori da React -- sta nella memoria del telefono e
 * sopravvive alla chiusura della pagina.
 */

const VUOTA: PendingSet[] = [];

// Il modulo gira anche sul server durante il rendering: li' non c'e' memoria
// da leggere, e la coda parte vuota.
let cache: PendingSet[] = typeof window === "undefined" ? VUOTA : loadPending();

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): PendingSet[] {
  return cache;
}

/** Durante l'idratazione la coda e' vuota: la memoria del telefono non c'e'. */
export function getServerSnapshot(): PendingSet[] {
  return VUOTA;
}

export function enqueue(item: PendingSet): void {
  const next = addPending(cache, item);
  if (next.length === cache.length && cache.length > 0) return;
  cache = next;
  savePending(cache);
  emit();
}

export function dequeue(clientId: string): void {
  const next = removePending(cache, clientId);
  if (next.length === cache.length) return;
  cache = next;
  savePending(cache);
  emit();
}

export type SendResult = { ok: true } | { ok: false; error: string };

// Un solo svuotamento alla volta: `online` e il montaggio possono partire
// insieme, e due invii della stessa serie sono inutili.
let svuotamentoInCorso = false;

/**
 * Prova a mandare tutte le serie in coda, nell'ordine in cui sono state
 * fatte. Si ferma al primo errore: se la rete non c'e', non c'e' per nessuna,
 * e insistere consuma solo batteria.
 *
 * Restituisce quante ne sono passate.
 */
export async function flush(
  send: (item: PendingSet) => Promise<SendResult>,
): Promise<number> {
  if (svuotamentoInCorso) return 0;
  svuotamentoInCorso = true;

  let inviate = 0;
  try {
    for (const item of [...cache].sort((a, b) => a.savedAt - b.savedAt)) {
      const result = await send(item);
      if (!result.ok) break;
      dequeue(item.clientId);
      inviate += 1;
    }
  } finally {
    svuotamentoInCorso = false;
  }
  return inviate;
}
