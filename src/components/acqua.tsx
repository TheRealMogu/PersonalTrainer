"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setWater } from "@/app/actions";
import { bicchieriDaMostrare, formatAcqua, MAX_BICCHIERI, progressoAcqua } from "@/lib/acqua";

/**
 * L'acqua della giornata: una riga, due tasti.
 *
 * Volutamente la cosa piu' semplice dell'app. Non ha macro, non entra nelle
 * medie, non ha un colore da difendere: e' un contatore. Se chiedesse di
 * scegliere la dimensione del bicchiere o l'orario, costerebbe piu' di
 * quanto vale -- e la roba che costa piu' di quanto vale non la si segna, che
 * e' esattamente il problema che questa app ha gia' col cibo.
 *
 * Il "meno" fa da annullamento: e' l'inverso esatto del "piu'", a un tocco.
 * Per questo non c'e' nessun messaggio che propone di disfare.
 */
export function Acqua({ day, bicchieri }: { day: string; bicchieri: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  // Il numero si muove al tocco, il salvataggio prosegue dietro: senza, su
  // rete lenta si tocca due volte e si segna un bicchiere in piu'.
  const [ottimistici, applica] = useOptimistic(bicchieri, (_, nuovo: number) => nuovo);
  const progresso = progressoAcqua(ottimistici);

  function cambia(delta: number) {
    const nuovo = Math.max(0, Math.min(MAX_BICCHIERI, ottimistici + delta));
    if (nuovo === ottimistici) return;

    setErrore(null);
    startTransition(async () => {
      applica(nuovo);
      const esito = await setWater(day, nuovo);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      router.refresh();
    });
  }

  const totale = bicchieriDaMostrare(ottimistici);

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted">Acqua</p>
          <p className="text-[15px] font-semibold tabular-nums">
            {formatAcqua(progresso.ml)}
            <span className="font-normal text-muted">
              {" di "}
              {formatAcqua(progresso.mlObiettivo)}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => cambia(-1)}
          disabled={ottimistici === 0}
          aria-label="Togli un bicchiere d'acqua"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline text-[20px] font-semibold text-muted tocco-riquadro active:bg-raised disabled:opacity-30"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => cambia(1)}
          disabled={ottimistici >= MAX_BICCHIERI}
          aria-label="Segna un bicchiere d'acqua"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-[20px] font-semibold text-on-accent tocco-riquadro active:opacity-80 disabled:opacity-40"
        >
          +
        </button>
      </div>

      {/*
        I bicchieri disegnati non sono decorazione: sono il conteggio, letto a
        colpo d'occhio invece che leggendo un numero. Il numero c'e' lo stesso
        sopra, perche' il colore non deve mai essere l'unico segnale
        (regola 10) e perche' oltre l'obiettivo i quadretti diventano tanti.
      */}
      <div
        aria-hidden="true"
        className="mt-2 flex flex-wrap items-center gap-1"
      >
        {Array.from({ length: totale }, (_, indice) => (
          <span
            key={indice}
            className={`h-2 flex-1 rounded-full transition-colors duration-200 ease-ios ${
              indice < ottimistici ? "bg-accent" : "bg-track"
            }`}
          />
        ))}
      </div>

      {errore ? (
        <p role="alert" className="mt-2 text-[13px] text-muted">
          {errore}
        </p>
      ) : null}
    </div>
  );
}
