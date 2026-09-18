"use client";

import { useEffect } from "react";

/**
 * Registra `public/sw.js`, solo in produzione.
 *
 * In sviluppo interferirebbe con l'hot reload di Next -- riscrive gli asset
 * a ogni salvataggio, e un service worker che tiene in cache la versione di
 * prima farebbe vedere codice vecchio dopo un cambio, con la stessa firma di
 * un bug: si guarda il file giusto e si misura quello sbagliato. Trappola
 * gia' pagata una volta con `EADDRINUSE`, non da ripagare qui.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // L'apertura offline e' un miglioramento, non un requisito: se la
      // registrazione fallisce l'app continua a funzionare normalmente con
      // la rete.
    });
  }, []);

  return null;
}
