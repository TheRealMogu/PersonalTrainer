"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { segnaIntegratore } from "@/app/actions";
import {
  riassuntoIntegratori,
  type IntegratoreDelGiorno,
} from "@/lib/integratori";

/**
 * Gli integratori della giornata: un tasto per ciascuno, si tocca e basta.
 *
 * Segue la forma dell'acqua e non quella del cibo, perche' la domanda e'
 * un'altra: non "quanto mi resta" ma "l'ho presa oggi?". Niente macro, niente
 * quantita', niente foglio da aprire -- un tocco mette la spunta, un altro la
 * toglie, e il secondo tocco *e'* l'annullamento del primo.
 *
 * Se non hai nessun integratore attivo questa riga non compare: chi non li
 * prende non deve vedere una riga vuota tutti i giorni.
 */
export function Integratori({
  day,
  integratori,
}: {
  day: string;
  integratori: IntegratoreDelGiorno[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);

  // La spunta si muove al tocco e il salvataggio prosegue dietro: senza, su
  // rete lenta si tocca due volte credendo che non abbia sentito.
  const [ottimistici, applica] = useOptimistic(
    integratori,
    (stato: IntegratoreDelGiorno[], azione: { id: number; preso: boolean }) =>
      stato.map((i) => (i.id === azione.id ? { ...i, preso: azione.preso } : i))
  );

  if (ottimistici.length === 0) return null;

  function cambia(integratore: IntegratoreDelGiorno) {
    const preso = !integratore.preso;
    setErrore(null);
    startTransition(async () => {
      applica({ id: integratore.id, preso });
      const esito = await segnaIntegratore(day, integratore.id, preso);
      if (!esito.ok) {
        setErrore(esito.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] text-muted">Integratori</p>
        <p className="text-[13px] tabular-nums text-muted">
          {riassuntoIntegratori(ottimistici)}
        </p>
      </div>

      {/*
        Uno accanto all'altro e non uno per riga.
        
        Misurato: in colonna due integratori occupavano 124 px, e spingevano
        la sezione *Aggiungi* -- cioe' il motivo per cui apri l'app -- sotto
        la piega. In riga ne occupano 44 e ci stanno comunque i nomi: il
        nome basta a distinguerli, la dose si legge nella schermata di
        gestione, dove la si decide.
      */}
      <ul className="mt-2 flex flex-wrap gap-2">
        {ottimistici.map((integratore) => (
          <li
            key={integratore.id}
            className="min-w-0 flex-1 basis-[calc(50%-0.25rem)]"
          >
            <button
              type="button"
              onClick={() => cambia(integratore)}
              aria-pressed={integratore.preso}
              title={integratore.dose ?? undefined}
              className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-left tocco-riquadro active:bg-raised ${
                integratore.preso
                  ? "border-accent/40 bg-accent/10"
                  : "border-hairline"
              }`}
            >
              {/*
                Il segno di spunta non e' l'unico segnale, e nemmeno il colore:
                il tasto dichiara `aria-pressed`, e il quadretto cambia forma
                oltre che tinta. Il colore da solo non basta mai (regola 7).
              */}
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-200 ease-ios ${
                  integratore.preso
                    ? "border-accent bg-accent-solid text-on-accent"
                    : "border-hairline text-transparent"
                }`}
              >
                ✓
              </span>
              {/*
                La dose non si mostra qui: sta nel `title` e nella schermata
                di gestione. Sul tasto di tutti i giorni il nome basta a
                sapere quale sia, e la riga resta alta 44 px invece di 62.
              */}
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                {integratore.nome}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {errore ? (
        <p role="alert" className="mt-2 text-[13px] text-muted">
          {errore}
        </p>
      ) : null}
    </div>
  );
}
