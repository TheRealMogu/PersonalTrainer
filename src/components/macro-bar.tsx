import { formatMacro, type MacroProgress } from "@/lib/nutrition";
import { MACRO_LABELS, MACRO_UNITS } from "@/lib/targets";

export function MacroBar({ progress }: { progress: MacroProgress }) {
  const { key, consumed, target, remaining, over, percent, isOver } = progress;
  const unit = MACRO_UNITS[key];

  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-medium">{MACRO_LABELS[key]}</span>
        <span className="text-[15px] tabular-nums text-muted">
          <span className={isOver ? "font-semibold text-over" : "font-semibold text-ink"}>
            {formatMacro(consumed, key)}
          </span>
          {" / "}
          {target} {unit}
        </span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-hairline">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            isOver ? "bg-over" : "bg-accent"
          }`}
          style={{ width: `${percent}%` }}
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
