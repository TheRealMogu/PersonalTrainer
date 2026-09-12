"use client";

import { useCallback, useSyncExternalStore } from "react";
import { formatElapsed } from "@/lib/workout";

/** Sveglia i lettori una volta al secondo. */
function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
}

/** Secondi interi: cambia una volta al secondo, quindi e' un valore stabile. */
function getSnapshot() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Tempo trascorso dall'inizio della seduta.
 *
 * Usa `useSyncExternalStore` perche' l'orologio e' una sorgente esterna a
 * React: cosi' il server rende sempre 00:00 (niente disallineamento in
 * idratazione) e il valore vero arriva dal browser. Partendo da `startedAt`
 * resta giusto anche riaprendo l'app a meta' allenamento.
 */
export function SessionTimer({ startedAt }: { startedAt: string }) {
  const startSeconds = Math.floor(new Date(startedAt).getTime() / 1000);
  const serverSnapshot = useCallback(() => startSeconds, [startSeconds]);
  const nowSeconds = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);

  return (
    <p className="text-[34px] font-semibold leading-none tabular-nums tracking-tight">
      {formatElapsed(nowSeconds - startSeconds)}
    </p>
  );
}
