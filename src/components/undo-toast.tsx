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
}: {
  message: string;
  seconds: number;
  onUndo: () => void;
  onDismiss: () => void;
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
      style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-ink/95 px-4 py-3 text-white shadow-lg backdrop-blur">
        <span className="min-w-0 flex-1 truncate text-[13px]">{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="-my-2 shrink-0 px-2 py-2 text-[15px] font-semibold text-white"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
