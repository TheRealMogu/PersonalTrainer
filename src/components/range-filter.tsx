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
            className={`flex min-h-11 items-center rounded-full px-5 text-[13px] font-medium transition-colors ${
              selected
                ? "bg-accent text-on-accent"
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
