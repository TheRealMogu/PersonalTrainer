"use client";

import { useTransition } from "react";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { formatDayLabel, isIsoDate, shiftIsoDate, todayIso } from "@/lib/date";

function hrefForDay(day: string, today: string) {
  return day === today ? "/" : `/?day=${day}`;
}

const ARROW_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-accent shadow-[0_1px_2px_rgba(0,0,0,0.04)] tocco-riquadro active:opacity-60";

/**
 * Il cambio giorno e' una navigazione lato server: su rete lenta passa circa
 * un secondo e mezzo con ancora il giorno vecchio a schermo. Questo indicatore
 * segnala che il tocco e' stato raccolto.
 */
function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-full border-2 border-hairline border-t-accent transition-opacity ${
        pending ? "animate-spin opacity-100" : "opacity-0"
      }`}
    />
  );
}

/**
 * La barra del giorno, con dentro il salto alla lista dei pasti.
 *
 * Quella seconda riga diceva "Diario", che e' informazione zero: sei
 * nell'app del diario. Adesso dice quanti pasti hai registrato ed e' un
 * bersaglio: un tocco porta alla lista.
 *
 * Serve perche' la lista sta a 1535 px, cioe' quattro gesti di scorrimento.
 * E' il prezzo della Fase 1 -- i modi per aggiungere stanno sopra la lista,
 * perche' prima il primo tasto rapido costava 882 px di scorrimento e
 * peggiorava a ogni pasto registrato. Il prezzo resta giusto, ma pagarlo
 * quattro volte no: questo tocco lo riporta a uno, senza aggiungere un
 * pixel di altezza.
 */
export function DayNav({ day, pasti }: { day: string; pasti: number }) {
  const router = useRouter();
  const [andandoA, startTransition] = useTransition();
  const today = todayIso();
  const previous = shiftIsoDate(day, -1);
  const next = shiftIsoDate(day, 1);

  function vaiA(nuovoGiorno: string) {
    if (nuovoGiorno === day) return;
    startTransition(() => {
      router.push(hrefForDay(nuovoGiorno, today));
    });
  }

  return (
    <div className="flex items-center justify-between pt-12 pb-6">
      <Link
        href={hrefForDay(previous, today)}
        aria-label="Giorno precedente"
        className={`relative ${ARROW_CLASS}`}
      >
        <Chevron direction="left" />
        <NavPending />
      </Link>

      <div className="min-w-0 flex-1 px-2 text-center">
        {/*
          Le frecce coprono solo ieri e domani. Sotto c'e' un `<input
          type="date">` invisibile e grande quanto il titolo: il tocco apre
          il selettore nativo del telefono invece di dover premere la
          freccia decine di volte per tornare a un mese fa.
        */}
        <div className="relative">
          <h1
            className={`flex min-h-11 items-center justify-center truncate text-[20px] font-bold capitalize leading-tight tracking-tight transition-opacity duration-200 ease-ios ${
              andandoA ? "opacity-50" : ""
            }`}
          >
            {formatDayLabel(day, today)}
          </h1>
          <input
            type="date"
            value={day}
            aria-label="Vai a un altro giorno"
            onChange={(event) => {
              const scelto = event.target.value;
              if (isIsoDate(scelto)) vaiA(scelto);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        {day !== today ? (
          <Link href="/" className="inline-block py-1 text-[13px] text-accent">
            Torna a oggi
          </Link>
        ) : pasti > 0 ? (
          <a
            href="#pasti"
            /*
              44 px pieni: era 59×28, e la regola 2 non fa sconti nemmeno a un
              collegamento piccolo dentro una barra. Trovato dalle prove col
              browser, non a occhio -- come le due volte precedenti.
            */
            className="inline-flex min-h-11 items-center justify-center px-3 text-[13px] text-accent tocco active:opacity-60"
          >
            {pasti === 1 ? "1 pasto" : `${pasti} pasti`} ↓
          </a>
        ) : (
          // A diario vuoto non c'e' niente a cui saltare, e "0 pasti" sarebbe
          // un rimprovero alle otto di mattina.
          <p className="py-1 text-[13px] text-muted">Diario</p>
        )}
      </div>

      <Link
        href={hrefForDay(next, today)}
        aria-label="Giorno successivo"
        className={`relative ${ARROW_CLASS}`}
      >
        <Chevron direction="right" />
        <NavPending />
      </Link>
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="10"
      height="16"
      viewBox="0 0 10 16"
      fill="none"
      aria-hidden="true"
      className={direction === "left" ? "" : "rotate-180"}
    >
      <path
        d="M8.5 1 1.5 8l7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
