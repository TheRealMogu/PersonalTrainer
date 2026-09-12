import { formatMacro, type MacroProgress } from "@/lib/nutrition";

const SIZE = 168;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Anello delle calorie con al centro quanto resta.
 *
 * E' la convenzione delle app di settore, e ha una ragione: la domanda di
 * questa app e' "quanto mi resta", quindi quel numero deve essere il piu'
 * grande della schermata, non uno dei quattro in fila.
 */
export function CalorieRing({ progress }: { progress: MacroProgress }) {
  const { consumed, target, remaining, over, percent, isOver } = progress;
  const filled = (Math.min(percent, 100) / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={
            isOver
              ? `${formatMacro(consumed, "kcal")} kcal su ${target}, oltre il target di ${formatMacro(over, "kcal")}`
              : `${formatMacro(consumed, "kcal")} kcal su ${target}, ne restano ${formatMacro(remaining, "kcal")}`
          }
        >
          {/* traccia */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-track)"
            strokeWidth={STROKE}
          />
          {/* parte consumata: parte da ore 12 e gira in senso orario */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={isOver ? "var(--color-over)" : "var(--color-kcal)"}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            className="transition-[stroke-dasharray] duration-500"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-[44px] font-semibold leading-none tracking-tight ${
              isOver ? "text-over" : ""
            }`}
          >
            {formatMacro(isOver ? over : remaining, "kcal")}
          </span>
          <span className="mt-1 text-[13px] text-muted">
            {isOver ? "oltre il target" : "kcal rimaste"}
          </span>
        </div>
      </div>

      <p className="mt-3 text-[13px] tabular-nums text-muted">
        <span className="font-semibold text-ink">{formatMacro(consumed, "kcal")}</span> di {target} kcal
      </p>
    </div>
  );
}
