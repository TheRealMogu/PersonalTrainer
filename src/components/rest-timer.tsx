"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/workout";

const DEFAULT_REST_SECONDS = 90;
const EXTRA_STEP = 15;

/**
 * Recupero fra le serie. Compare da solo dopo aver segnato una serie, perche'
 * in palestra il timer si fa partire sempre e nessuno ha voglia di cercarlo.
 *
 * Conta scalando un contatore invece di guardare l'orologio: per un recupero
 * di un minuto e mezzo la deriva e' irrilevante, e il componente resta puro.
 */
export function RestTimer({ onClose }: { onClose: () => void }) {
  const [left, setLeft] = useState(DEFAULT_REST_SECONDS);
  const [target, setTarget] = useState(DEFAULT_REST_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const done = left <= 0;
  const percent = target > 0 ? Math.min(100, ((target - left) / target) * 100) : 100;

  function addTime() {
    setLeft((value) => value + EXTRA_STEP);
    setTarget((value) => value + EXTRA_STEP);
  }

  return (
    /*
      Niente `role="status"` sul contenitore: il numero cambia ogni secondo e
      un lettore di schermo lo annuncerebbe sessanta volte per un recupero di
      un minuto -- proprio in palestra, dove l'audio e' l'unico canale libero.
      La zona viva e' solo la riga di stato, che cambia una volta sola.
    */
    <div
      className="fixed inset-x-0 z-20 px-5"
      style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-overlay/95 text-on-overlay shadow-lg backdrop-blur">
        <div className="h-1 w-full bg-overlay-track">
          <div
            className={`h-full transition-[width] duration-500 ${done ? "bg-over" : "bg-accent"}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p role="status" className="text-[12px] text-on-overlay/70">
              {done ? "Recupero finito" : "Recupero"}
            </p>
            {/* Il numero resta visivo: chi non vede lo schermo ha l'annuncio sopra. */}
            <p aria-hidden="true" className="text-[22px] font-semibold leading-tight tabular-nums">
              {formatElapsed(left)}
            </p>
          </div>

          <button
            type="button"
            onClick={addTime}
            className="h-11 shrink-0 rounded-xl bg-overlay-track px-3 text-[13px] font-semibold"
          >
            +{EXTRA_STEP}s
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 shrink-0 px-2 text-[15px] font-semibold"
          >
            {done ? "Chiudi" : "Salta"}
          </button>
        </div>
      </div>
    </div>
  );
}
