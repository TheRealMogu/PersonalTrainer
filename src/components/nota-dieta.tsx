"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvaNotaDieta } from "@/app/storico/actions";
import { MAX_NOTA_DIETA } from "@/lib/riepilogo";

/**
 * La nota sulla dieta della settimana: fame, sgarri -- quello che kcal e
 * macro non dicono da soli, e che il PT chiede ogni domenica insieme al
 * numero della settimana.
 */
export function NotaDieta({
  weekStart,
  nota,
}: {
  weekStart: string;
  nota: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [aperta, setAperta] = useState(false);
  const [testo, setTesto] = useState(nota ?? "");
  const [errore, setErrore] = useState<string | null>(null);

  function salva() {
    setErrore(null);
    startTransition(async () => {
      const esito = await salvaNotaDieta(weekStart, testo);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setAperta(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-hairline pt-3">
      {aperta ? (
        <div>
          <label className="block">
            <span className="mb-1 block text-[13px] text-muted">
              Dieta questa settimana
            </span>
            <textarea
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              rows={3}
              maxLength={MAX_NOTA_DIETA}
              autoFocus
              placeholder="Es. fame giovedì, sgarro sabato sera"
              className="w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 text-[15px] outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setTesto(nota ?? "");
                setAperta(false);
              }}
              className="min-h-12 flex-1 rounded-xl border border-hairline text-[15px] font-medium text-muted tocco active:bg-raised"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={salva}
              className="min-h-12 flex-1 rounded-xl bg-accent-solid text-[15px] font-semibold text-on-accent tocco active:opacity-80"
            >
              Salva
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAperta(true)}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl text-left tocco active:bg-raised"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-muted">Dieta</span>
            <span className="block text-[15px] leading-snug">
              {nota ?? (
                <span className="text-muted">
                  Scrivi fame o sgarri — è quello che il PT chiede ogni
                  domenica.
                </span>
              )}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-[13px] text-reference"
          >
            ›
          </span>
        </button>
      )}

      {errore ? (
        <p role="alert" className="mt-2 text-[13px] text-muted">
          {errore}
        </p>
      ) : null}
    </div>
  );
}
