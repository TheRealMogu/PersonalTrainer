"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * "Riprova" ricarica i dati dal server senza ricaricare la pagina intera.
 * Mostra subito che sta facendo qualcosa: un pulsante che resta muto invita a
 * premerlo di nuovo.
 */
export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tentativi, setTentativi] = useState(0);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setTentativi((n) => n + 1);
          startTransition(() => router.refresh());
        }}
        className="min-h-11 w-full rounded-xl bg-accent px-4 text-[15px] font-medium text-on-accent tocco active:opacity-60 disabled:opacity-60"
      >
        {pending ? "Riprovo…" : "Riprova"}
      </button>

      {/* Dopo due tentativi a vuoto, dirlo: continuare a premere non aiuta. */}
      {tentativi >= 2 && !pending ? (
        <p className="mt-2 text-[13px] text-muted">
          Non è cambiato niente dopo {tentativi} tentativi: probabilmente non si
          risolve da solo.
        </p>
      ) : null}
    </div>
  );
}
