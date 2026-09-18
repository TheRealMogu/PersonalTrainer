"use client";

import { useState } from "react";

/**
 * Un reload vero, non `router.refresh()`: questa pagina arriva dal service
 * worker mentre l'app e' ancora offline, senza che il router lato client sia
 * mai partito. Un reload vero rifa' la navigazione da capo, ed e' quella che
 * il service worker intercetta per tentare di nuovo la rete.
 */
export function OfflineRetryButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        window.location.reload();
      }}
      className="min-h-11 w-full rounded-xl bg-accent-solid px-4 text-[15px] font-medium text-on-accent tocco active:opacity-60 disabled:opacity-60"
    >
      {pending ? "Riprovo…" : "Riprova"}
    </button>
  );
}
