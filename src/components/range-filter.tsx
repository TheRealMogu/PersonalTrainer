import Link from "next/link";

const RANGES = [7, 30];

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
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
              selected
                ? "bg-accent text-white"
                : "border border-hairline bg-surface text-muted"
            }`}
          >
            {days} giorni
          </Link>
        );
      })}
    </div>
  );
}
