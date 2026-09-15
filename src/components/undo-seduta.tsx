"use client";

import { useSyncExternalStore, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reopenSession, restoreSession } from "@/app/allenamento/actions";
import {
  chiudiAnnullamento,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/undo-seduta-store";
import { UndoToast } from "./undo-toast";

const UNDO_SECONDS = 6;

/**
 * Il messaggio "Annulla" per le azioni che cambiano schermata: chiudere una
 * seduta, scartarla, eliminarne una dallo storico.
 *
 * Sta sulla pagina e non dentro la schermata della seduta di proposito: e'
 * proprio quella schermata a sparire quando l'azione riesce.
 */
export function UndoSeduta() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pendente = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!pendente) {
    return error ? (
      <p role="alert" className="mb-4 px-1 text-[13px] text-over">
        {error}
      </p>
    ) : null;
  }

  function handleUndo() {
    const azione = pendente;
    chiudiAnnullamento();
    if (!azione) return;

    startTransition(async () => {
      setError(null);
      const result =
        azione.tipo === "riapri"
          ? await reopenSession(azione.sessionId)
          : await restoreSession(azione.backup);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <UndoToast
      key={pendente.messaggio}
      message={pendente.messaggio}
      seconds={UNDO_SECONDS}
      onUndo={handleUndo}
      onDismiss={chiudiAnnullamento}
    />
  );
}
