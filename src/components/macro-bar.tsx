import { formatMacro, type MacroProgress } from "@/lib/nutrition";
import { MACRO_LABELS, MACRO_UNITS, type MacroKey } from "@/lib/targets";

/** Ogni macro ha il suo colore, sempre lo stesso su tutte le schermate. */
const MACRO_COLOR: Record<MacroKey, string> = {
  kcal: "var(--color-kcal)",
  carbs: "var(--color-carbs)",
  protein: "var(--color-protein)",
  fat: "var(--color-fat)",
};

/**
 * Barra di un macro. Il colore identifica il macro, non lo stato: il fuori
 * target si vede dal rosso del numero e dalla scritta, cosi' resta leggibile
 * anche a chi non distingue le tinte.
 */
export function MacroBar({ progress }: { progress: MacroProgress }) {
  const { key, consumed, target, remaining, over, percent, isOver } = progress;
  const unit = MACRO_UNITS[key];

  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 text-[15px] font-medium">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: isOver ? "var(--color-over)" : MACRO_COLOR[key] }}
          />
          {MACRO_LABELS[key]}
        </span>
        <span className="text-[15px] tabular-nums text-muted">
          <span className={isOver ? "font-semibold text-over" : "font-semibold text-ink"}>
            {formatMacro(consumed, key)}
          </span>
          {" / "}
          {target} {unit}
        </span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${percent}%`,
            background: isOver ? "var(--color-over)" : MACRO_COLOR[key],
          }}
        />
      </div>

      <p className={`mt-1.5 text-[13px] ${isOver ? "text-over" : "text-muted"}`}>
        {isOver
          ? `Oltre target di ${formatMacro(over, key)} ${unit}`
          : `Rimangono ${formatMacro(remaining, key)} ${unit}`}
      </p>
    </div>
  );
}
