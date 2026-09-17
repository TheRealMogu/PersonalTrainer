"use client";

import Link, { useLinkStatus } from "next/link";

const RANGES = [7, 30];

/**
 * Cambiare intervallo e' una navigazione lato server, come le frecce del
 * giorno: su rete lenta il tocco resta muto per oltre un secondo. Stesso
 * rimedio gia' usato in `day-nav.tsx`.
 */
function FiltroInAttesa() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-full border-2 border-transparent border-t-accent transition-opacity ${
        pending ? "animate-spin opacity-100" : "opacity-0"
      }`}
    />
  );
}

/** Unica riga di filtro, sopra tutto quello che governa. */
export function RangeFilter({ active }: { active: number }) {
  return (
    <div className="mb-4 flex gap-2" role="group" aria-label="Intervallo">
      {RANGES.map((days) => {
        const selected = days === active;
        return (
          <Link
            key={days}
            href={days === 7 ? "/storico" : `/storico?giorni=${days}`}
            aria-current={selected ? "true" : undefined}
            className={`relative flex min-h-11 items-center rounded-full px-5 text-[13px] font-medium transition-colors duration-200 ease-ios ${
              selected
                ? "bg-accent text-on-accent"
                : "border border-hairline bg-surface text-muted"
            }`}
          >
            {days} giorni
            <FiltroInAttesa />
          </Link>
        );
      })}
    </div>
  );
}
