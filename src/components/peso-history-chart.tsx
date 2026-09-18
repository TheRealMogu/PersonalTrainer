import { formatPeso, type PesoGiorno } from "@/lib/peso";

const WIDTH = 320;
const PLOT = 64;
const HEIGHT = PLOT;
const DOT = 4;

/**
 * L'andamento del peso nel periodo guardato.
 *
 * Una linea come per il massimale in palestra: qui la domanda e' "sta
 * scendendo o salendo?", non "quanto pesavo quel giorno" -- e il peso e'
 * continuo nel tempo, non un valore isolato per giornata come le kcal.
 *
 * I giorni senza una misura restano fuori dalla linea, non diventano zeri:
 * un buco nel grafico e' onesto, uno zero mentirebbe (regola 6).
 */
export function PesoHistoryChart({ pesi }: { pesi: PesoGiorno[] }) {
  if (pesi.length === 0) return null;

  const values = pesi.map((riga) => riga.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || max || 1;
  const padded = { low: min - span * 0.25, high: max + span * 0.25 };
  const range = padded.high - padded.low;

  const x = (index: number) =>
    pesi.length === 1
      ? WIDTH / 2
      : (index / (pesi.length - 1)) * (WIDTH - 16) + 8;
  const y = (value: number) => PLOT - ((value - padded.low) / range) * PLOT;

  const line = pesi
    .map((riga, index) => `${x(index)},${y(riga.weightKg)}`)
    .join(" ");
  const primo = pesi[0];
  const ultimo = pesi.at(-1)!;
  const delta = ultimo.weightKg - primo.weightKg;

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium">Peso</span>
        <span className="text-[13px] tabular-nums text-muted">
          {formatPeso(ultimo.weightKg)} kg
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`Peso da ${formatPeso(primo.weightKg)} a ${formatPeso(
          ultimo.weightKg,
        )} kg, su ${pesi.length} misure`}
      >
        <line
          x1="0"
          y1={PLOT}
          x2={WIDTH}
          y2={PLOT}
          stroke="var(--color-hairline)"
          strokeWidth="1"
        />

        <polyline
          points={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {pesi.map((riga, index) => (
          <circle
            key={riga.day}
            cx={x(index)}
            cy={y(riga.weightKg)}
            r={index === pesi.length - 1 ? DOT + 1 : DOT}
            fill="var(--color-accent)"
            stroke="var(--color-surface)"
            strokeWidth="2"
          />
        ))}
      </svg>

      <div
        className="mt-1 flex justify-between text-[11px] tabular-nums text-muted"
        aria-hidden="true"
      >
        <span>
          {primo.day.slice(8, 10)}/{primo.day.slice(5, 7)}
        </span>
        <span>
          {ultimo.day.slice(8, 10)}/{ultimo.day.slice(5, 7)}
        </span>
      </div>

      <p className="mt-1 text-[13px] text-muted">
        {pesi.length === 1
          ? "Una sola misura in questo periodo."
          : delta !== 0
            ? `${delta > 0 ? "+" : "−"}${formatPeso(
                Math.abs(delta),
              )} kg dalla prima misura del periodo.`
            : "Invariato dalla prima misura del periodo."}
      </p>
    </figure>
  );
}
