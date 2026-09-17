"use client";

import { useEffect } from "react";

/**
 * Rete di sicurezza per tutto quello che non e' una lettura del database:
 * quelle le intercettano le pagine, che sul server hanno ancora il messaggio
 * vero e possono dire cosa e' successo.
 *
 * Qui invece il messaggio in produzione Next lo nasconde e lascia solo un
 * codice: quindi non si prova a indovinare la causa, si dice cosa fare.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] errore non gestito:", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col justify-center">
      <section className="rounded-2xl bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h1 className="text-[22px] font-semibold">Qualcosa è andato storto</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Non sono riuscito a caricare questa schermata. Quello che hai già
          registrato è al sicuro.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-4 min-h-11 w-full rounded-xl bg-accent-solid px-4 text-[15px] font-medium text-on-accent transition-opacity active:opacity-60"
        >
          Riprova
        </button>

        {/* Il codice serve a ritrovare l'errore nei log: senza, si cerca a caso. */}
        {error.digest ? (
          <p className="mt-4 text-[13px] tabular-nums text-muted">
            Codice per i log: {error.digest}
          </p>
        ) : null}
      </section>
    </main>
  );
}
