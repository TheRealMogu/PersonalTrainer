import { formatMacro } from "@/lib/nutrition";
import { DAILY_TARGETS, MACRO_LABELS, MACRO_UNITS, type MacroKey } from "@/lib/targets";

/**
 * Media giornaliera di un macro con lo scarto dal target.
 * Il valore usa le cifre proporzionali: `tabular-nums` serve nelle colonne,
 * non su un numero grande isolato.
 */
export function MacroStatTile({ macro, average }: { macro: MacroKey; average: number }) {
  const target = DAILY_TARGETS[macro];
  const delta = average - target;
  const isOver = delta > 0;
  const rounded = Number(formatMacro(Math.abs(delta), macro));

  return (
    <div className="rounded-xl border border-hairline px-3 py-2.5">
      <p className="text-[13px] text-muted">{MACRO_LABELS[macro]}</p>
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
