import { arrotondaMacro, formatMacro } from "@/lib/nutrition";
import { DAILY_TARGETS, MACRO_LABELS, MACRO_UNITS, type MacroKey } from "@/lib/targets";

const MACRO_COLOR: Record<MacroKey, string> = {
  kcal: "var(--color-kcal)",
  carbs: "var(--color-carbs)",
  protein: "var(--color-protein)",
  fat: "var(--color-fat)",
};

/**
 * Media giornaliera di un macro con lo scarto dal target.
 * Il valore usa le cifre proporzionali: `tabular-nums` serve nelle colonne,
 * non su un numero grande isolato.
 */
export function MacroStatTile({
  macro,
  average,
  target = DAILY_TARGETS[macro],
}: {
  macro: MacroKey;
  average: number;
  target?: number;
}) {
  const delta = average - target;
  const isOver = delta > 0;
  const rounded = arrotondaMacro(Math.abs(delta), macro);

  return (
    <div className="rounded-xl border border-hairline px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[13px] text-muted">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: MACRO_COLOR[macro] }}
        />
        {MACRO_LABELS[macro]}
      </p>
      <p className="mt-0.5 text-[22px] font-semibold leading-tight">
        {formatMacro(average, macro)}
        <span className="ml-1 text-[13px] font-normal text-muted">{MACRO_UNITS[macro]}</span>
      </p>
      <p className={`mt-0.5 text-[13px] ${isOver ? "text-over" : "text-muted"}`}>
        {rounded === 0
          ? "in linea"
          : `${isOver ? "+" : "−"}${rounded} ${MACRO_UNITS[macro]}`}
      </p>
    </div>
  );
}
