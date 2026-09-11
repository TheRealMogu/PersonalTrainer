"use client";

import Link from "next/link";
import { formatDayLabel, shiftIsoDate, todayIso } from "@/lib/date";

function hrefForDay(day: string, today: string) {
  return day === today ? "/" : `/?day=${day}`;
}

export function DayNav({ day }: { day: string }) {
  const today = todayIso();
  const previous = shiftIsoDate(day, -1);
  const next = shiftIsoDate(day, 1);

  return (
    <div className="flex items-center justify-between pt-12 pb-6">
      <Link
        href={hrefForDay(previous, today)}
        aria-label="Giorno precedente"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-accent shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:opacity-60"
      >
        <Chevron direction="left" />
      </Link>

      <div className="min-w-0 flex-1 px-2 text-center">
        <h1 className="truncate text-[20px] font-bold capitalize leading-tight tracking-tight">
          {formatDayLabel(day, today)}
        </h1>
        {day !== today ? (
          <Link href="/" className="text-[13px] text-accent">
            Torna a oggi
          </Link>
        ) : (
          <p className="text-[13px] text-muted">Diario</p>
        )}
      </div>

      <Link
        href={hrefForDay(next, today)}
        aria-label="Giorno successivo"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-accent shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:opacity-60"
      >
        <Chevron direction="right" />
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
