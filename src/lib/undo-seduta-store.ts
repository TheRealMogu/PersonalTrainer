"use client";

import type { SessionBackup } from "@/app/allenamento/actions";

/**
 * L'annullamento di un'azione sulla seduta, tenuto fuori da React.
 *
 * Serve perche' chiudere o scartare un allenamento fa sparire la schermata
 * della seduta: un messaggio "Annulla" che vivesse li' dentro se ne andrebbe
 * con lei, proprio nel momento in cui serve. Qui invece sopravvive al
 * cambio di schermata, e lo legge un componente che sta sulla pagina.
 */

export type UndoSeduta =
  | { tipo: "riapri"; sessionId: number; messaggio: string }
  | { tipo: "ripristina"; backup: SessionBackup; messaggio: string };

let pendente: UndoSeduta | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): UndoSeduta | null {
  return pendente;
}

/** Sul server non c'e' niente in sospeso: la schermata parte pulita. */
export function getServerSnapshot(): UndoSeduta | null {
  return null;
}

export function proponiAnnullamento(azione: UndoSeduta): void {
  pendente = azione;
  emit();
}

export function chiudiAnnullamento(): void {
  if (pendente === null) return;
  pendente = null;
  emit();
}
