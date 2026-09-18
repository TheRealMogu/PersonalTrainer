"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvaNotaSeduta, spostaSeduta } from "@/app/allenamento/actions";
import { MAX_NOTE } from "@/lib/workout";
import { formatDayLabel, todayIso } from "@/lib/date";

/**
 * La nota di una seduta, e la sua data.
 *
 * "Spalla che tira" vale piu' di tre decimali sul carico: fra un mese e'
 * l'unica cosa che spiega perche' quel giorno la panca e' scesa. I numeri
 * dicono cosa hai fatto, questa riga dice perche'.
 *
 * La data sta qui accanto perche' e' l'altra cosa che si corregge a
 * posteriori: se ti dimentichi di registrare l'altroieri, prima non c'era
 * modo di rimediare e una seduta vera restava fuori dallo storico.
 */
export function NotaSeduta({
  sessionId,
  nota,
  giorno,
}: {
  sessionId: number;
  nota: string | null;
  giorno: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [aperta, setAperta] = useState(false);
  const [testo, setTesto] = useState(nota ?? "");
  const [errore, setErrore] = useState<string | null>(null);
  const oggi = todayIso();

  function salva() {
    setErrore(null);
    startTransition(async () => {
      const esito = await salvaNotaSeduta(sessionId, testo);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      setAperta(false);
      router.refresh();
    });
  }

  function sposta(nuovoGiorno: string) {
    setErrore(null);
    startTransition(async () => {
      const esito = await spostaSeduta(sessionId, nuovoGiorno);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      {aperta ? (
        <div>
          <label className="block">
            <span className="mb-1 block text-[13px] text-muted">
              Com&apos;è andata
            </span>
            <textarea
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              rows={3}
              maxLength={MAX_NOTE}
              autoFocus
              placeholder="Es. spalla destra che tira sulle spinte"
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
            <span className="block text-[13px] text-muted">Nota</span>
            <span className="block text-[15px] leading-snug">
              {nota ?? (
                <span className="text-muted">
                  Scrivi com&apos;è andata — vale più di tre decimali sul
                  carico.
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

      {/*
        La data si corregge da qui. La *giornata* del programma no: quella
        decide quali esercizi ci sono, e spostarla dopo aver registrato dei
        carichi lascerebbe le serie attaccate a esercizi di un'altra giornata.
        Meglio non poterlo fare che poterlo fare male.
      */}
      <label className="mt-3 flex min-h-11 items-center justify-between gap-3 border-t border-hairline pt-3">
        <span className="text-[13px] text-muted">
          Data della seduta
          <span className="block text-[11px]">
            {formatDayLabel(giorno, oggi)}
          </span>
        </span>
        <input
          type="date"
          value={giorno}
          max={oggi}
          onChange={(e) => {
            if (e.target.value) sposta(e.target.value);
          }}
          className="min-h-11 rounded-xl border border-hairline bg-raised px-3 text-[15px] tabular-nums outline-none focus:border-accent"
        />
      </label>

      {errore ? (
        <p role="alert" className="mt-2 text-[13px] text-muted">
          {errore}
        </p>
      ) : null}
    </div>
  );
}
