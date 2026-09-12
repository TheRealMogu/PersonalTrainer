import type { ExerciseProgress } from "@/lib/queries";
import { formatWeight } from "@/lib/workout";

const WIDTH = 320;
const PLOT = 64;
const AXIS = 14;
const HEIGHT = PLOT + AXIS;
const DOT = 4;

/**
 * Andamento del massimale stimato per un esercizio.
 *
 * Una linea e non colonne: qui il dato e' continuo nel tempo e la domanda e'
 * "sta salendo?", non "quanto ho fatto quel giorno". L'ultimo punto e'
 * etichettato; gli altri li dice la tabella sotto.
 */
export function ExerciseProgressChart({ progress }: { progress: ExerciseProgress }) {
  const { points } = progress;
  const values = points.map((point) => point.bestOneRepMax);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Se il carico non e' cambiato la linea sarebbe piatta a meta': va bene,
  // ma serve un intervallo non nullo per non dividere per zero.
  const span = max - min || max || 1;
  const padded = { low: min - span * 0.25, high: max + span * 0.25 };
  const range = padded.high - padded.low;

  const x = (index: number) =>
    points.length === 1 ? WIDTH / 2 : (index / (points.length - 1)) * (WIDTH - 16) + 8;
  const y = (value: number) => PLOT - ((value - padded.low) / range) * PLOT;

  const line = points.map((point, index) => `${x(index)},${y(point.bestOneRepMax)}`).join(" ");
  const last = points.at(-1)!;
  const first = points[0];
  const delta = last.bestOneRepMax - first.bestOneRepMax;

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex items-baseline justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{progress.name}</span>
        <span className="shrink-0 text-[13px] tabular-nums text-muted">
          {formatWeight(last.topWeight)} kg × {last.topReps}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`${progress.name}: massimale stimato da ${formatWeight(first.bestOneRepMax)} a ${formatWeight(last.bestOneRepMax)} kg in ${points.length} sedute`}
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

        {points.map((point, index) => (
          <circle
            key={point.day}
            cx={x(index)}
            cy={y(point.bestOneRepMax)}
            r={index === points.length - 1 ? DOT + 1 : DOT}
            fill="var(--color-accent)"
            stroke="var(--color-surface)"
            strokeWidth="2"
          />
        ))}

        <text
          x="0"
          y={HEIGHT - 2}
          fontSize="9"
          fill="var(--color-muted)"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {first.day.slice(8, 10)}/{first.day.slice(5, 7)}
        </text>
        <text
          x={WIDTH}
          y={HEIGHT - 2}
          textAnchor="end"
          fontSize="9"
          fill="var(--color-muted)"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {last.day.slice(8, 10)}/{last.day.slice(5, 7)}
        </text>
      </svg>

      <p className="mt-1 text-[13px] text-muted">
        Massimale stimato{" "}
        <span className="font-semibold text-ink">{formatWeight(last.bestOneRepMax)} kg</span>
        {delta !== 0 ? (
          <>
            {" · "}
            {delta > 0 ? "+" : "−"}
            {formatWeight(Math.abs(delta))} kg dalla prima seduta
          </>
        ) : (
          " · invariato dalla prima seduta"
        )}
      </p>
    </figure>
  );
}
