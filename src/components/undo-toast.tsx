"use client";

import { useEffect, useState } from "react";

/**
 * Barra di annullamento sopra la tab bar. Un'eliminazione per sbaglio e' il
 * modo piu' facile di perdere dati in un diario, quindi resta reversibile per
 * qualche secondo invece di chiedere una conferma a ogni tocco.
 */
export function UndoToast({
  message,
  seconds,
  onUndo,
  onDismiss,
  distanzaRem = 4.25,
}: {
  message: string;
  seconds: number;
  onUndo: () => void;
  onDismiss: () => void;
  /** Distanza dal fondo, in rem. Si alza se sotto c'e' gia' qualcosa. */
  distanzaRem?: number;
}) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) {
      onDismiss();
      return;
    }
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, onDismiss]);

  return (
    <div
      role="status"
      className="fixed inset-x-0 z-20 px-5"
      /*
        `distanzaRem` serve quando in fondo c'e' gia' qualcos'altro: in
        palestra il timer di recupero sta nello stesso punto, e senza spostare
        il messaggio il pulsante "Annulla" finiva sotto il timer, visibile ma
        non toccabile.
      */
      style={{ bottom: `calc(${distanzaRem}rem + env(safe-area-inset-bottom))` }}
    >
      <div className="mx-auto flex w-full max-w-md animate-barra items-center gap-3 rounded-xl bg-overlay/95 px-4 py-3 text-on-overlay shadow-lg backdrop-blur">
        <span className="min-w-0 flex-1 truncate text-[13px]">{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="-my-1 flex min-h-11 shrink-0 items-center px-3 text-[15px] font-semibold text-on-overlay"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
