import { axisMax, isLogged, type DailyTotals } from "@/lib/history";
import { formatMacro } from "@/lib/nutrition";
import { DAILY_TARGETS, MACRO_LABELS, MACRO_UNITS, type MacroKey } from "@/lib/targets";

/* Geometria del grafico, in unita' del viewBox. */
const WIDTH = 320;
const PLOT_HEIGHT = 96;
const AXIS_BAND = 16;
const HEIGHT = PLOT_HEIGHT + AXIS_BAND;
const BAR_GAP = 2; // gap nel colore della superficie fra colonne adiacenti
const MAX_BAR_WIDTH = 18;
const RADIUS = 4;

const WEEKDAY_INITIALS = ["D", "L", "M", "M", "G", "V", "S"];

/** Lo stesso colore che il macro ha nel diario: l'identita' non cambia schermata. */
const MACRO_COLOR: Record<MacroKey, string> = {
  kcal: "var(--color-kcal)",
  carbs: "var(--color-carbs)",
  protein: "var(--color-protein)",
  fat: "var(--color-fat)",
};

function weekdayInitial(iso: string): string {
  return WEEKDAY_INITIALS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

function dayOfMonth(iso: string): string {
  return String(Number(iso.slice(8, 10)));
}

/**
 * Colonna con estremo superiore arrotondato e base squadrata: il path parte
 * dalla baseline, sale, gira con due archi e ridiscende.
 */
function barPath(x: number, y: number, width: number, height: number): string {
  const radius = Math.min(RADIUS, width / 2, height);
  const bottom = y + height;
  return [
    `M ${x} ${bottom}`,
    `L ${x} ${y + radius}`,
    `A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`,
    `L ${x + width - radius} ${y}`,
    `A ${radius} ${radius} 0 0 1 ${x + width} ${y + radius}`,
    `L ${x + width} ${bottom}`,
    "Z",
  ].join(" ");
}

export function MacroHistoryChart({
  macro,
  days,
}: {
  macro: MacroKey;
  days: DailyTotals[];
}) {
  const target = DAILY_TARGETS[macro];
  const max = axisMax(days, macro);
  const unit = MACRO_UNITS[macro];

  const band = WIDTH / days.length;
  const barWidth = Math.min(MAX_BAR_WIDTH, band - BAR_GAP);
  const targetY = PLOT_HEIGHT - (target / max) * PLOT_HEIGHT;

  // Con 30 colonne le iniziali si toccherebbero: etichettiamo un giorno su cinque.
  const labelEvery = days.length > 10 ? 5 : 1;
  const compact = days.length > 10;

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex items-baseline justify-between">
        <span className="text-[15px] font-medium">{MACRO_LABELS[macro]}</span>
        <span className="text-[13px] tabular-nums text-muted">
          target {target} {unit}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`${MACRO_LABELS[macro]} per giorno, target ${target} ${unit}`}
      >
        {/* baseline: hairline solida, un passo sopra la superficie */}
        <line
          x1="0"
          y1={PLOT_HEIGHT}
          x2={WIDTH}
          y2={PLOT_HEIGHT}
          stroke="var(--color-hairline)"
          strokeWidth="1"
        />

        {/* linea del target: e' un riferimento, quindi si stacca dalla griglia */}
        <line
          x1="0"
          y1={targetY}
          x2={WIDTH}
          y2={targetY}
          stroke="var(--color-reference)"
          strokeWidth="1"
        />

        {days.map((day, index) => {
          const value = day[macro];
          const height = max > 0 ? (value / max) * PLOT_HEIGHT : 0;
          const x = index * band + (band - barWidth) / 2;
          const y = PLOT_HEIGHT - height;
          const isOver = value > target;
          const label = compact ? dayOfMonth(day.day) : weekdayInitial(day.day);

          return (
            <g key={day.day}>
              {height > 0 ? (
                <path
                  d={barPath(x, y, barWidth, height)}
                  fill={isOver ? "var(--color-over)" : MACRO_COLOR[macro]}
                />
              ) : null}
              {index % labelEvery === 0 ? (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--color-muted)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Vista tabellare: ogni valore del grafico resta leggibile come numero. */
export function MacroHistoryTable({ days }: { days: DailyTotals[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px] tabular-nums">
        <thead>
          <tr className="text-muted">
            <th scope="col" className="py-2 text-left font-medium">Giorno</th>
            <th scope="col" className="py-2 text-right font-medium">kcal</th>
            <th scope="col" className="py-2 text-right font-medium">C</th>
            <th scope="col" className="py-2 text-right font-medium">P</th>
            <th scope="col" className="py-2 text-right font-medium">G</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day} className="border-t border-hairline">
              <th scope="row" className="py-2 text-left font-normal">
                {day.day.slice(8, 10)}/{day.day.slice(5, 7)}
              </th>
              {isLogged(day) ? (
                <>
                  <td className="py-2 text-right">{formatMacro(day.kcal, "kcal")}</td>
                  <td className="py-2 text-right">{formatMacro(day.carbs, "carbs")}</td>
                  <td className="py-2 text-right">{formatMacro(day.protein, "protein")}</td>
                  <td className="py-2 text-right">{formatMacro(day.fat, "fat")}</td>
                </>
              ) : (
                /* giorno non compilato: non uno zero, che sembrerebbe digiuno */
                <td className="py-2 text-right text-muted" colSpan={4}>
                  non registrato
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
