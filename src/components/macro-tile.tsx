"use client";

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
 * Un macro in un riquadro invece che in una riga a tutta larghezza.
 *
 * Le tre barre impilate occupavano nove righe e mezzo schermo per dire tre
 * numeri. Qui stanno affiancate: la domanda "quanto mi resta" si legge tutta
 * insieme, senza scorrere.
 *
 * Il numero grande e' quello che **resta**, non quello consumato: e' la
 * domanda dell'app. Il consumato resta sotto, piu' piccolo.
 */
export function MacroTile({
  progress,
  onOpen,
}: {
  progress: MacroProgress;
  onOpen: (key: MacroKey) => void;
}) {
  const { key, consumed, target, remaining, over, percent, isOver } = progress;
  const unit = MACRO_UNITS[key];

  return (
    <button
      type="button"
      onClick={() => onOpen(key)}
      aria-label={
        isOver
          ? `${MACRO_LABELS[key]}: oltre il target di ${formatMacro(over, key)} ${unit}. Tocca per il dettaglio.`
          : `${MACRO_LABELS[key]}: restano ${formatMacro(remaining, key)} ${unit} su ${target}. Tocca per il dettaglio.`
      }
      className="flex min-h-11 flex-col rounded-xl border border-hairline bg-raised px-2 py-2.5 text-left transition active:scale-[0.97] active:bg-surface"
    >
      {/*
        Il pallino sta accanto al numero e non all'etichetta: a tre colonne
        rubava i pixel che servono per scrivere "Carboidrati" per intero, e
        un'etichetta troncata vale meno di un pallino.
      */}
      {/*
        La freccia dice che il riquadro si apre. Senza, l'unico modo di
        scoprirlo e' toccarlo per caso: una cosa toccabile deve dichiararsi.
      */}
      <span className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-medium leading-tight tracking-tight text-muted">
          {MACRO_LABELS[key]}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-reference"
        >
          <path
            d="M3.5 1.5 7 5l-3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span className="mt-1.5 flex items-baseline gap-1">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 self-center rounded-full"
          style={{ background: isOver ? "var(--color-over)" : MACRO_COLOR[key] }}
        />
        <span
          className={`text-[19px] font-semibold leading-none tabular-nums ${isOver ? "text-over" : ""}`}
        >
          {formatMacro(isOver ? over : remaining, key)}
        </span>
        <span className="text-[12px] text-muted">{unit}</span>
      </span>

      {/* La parola conta quanto il colore: "oltre" si legge anche in grigio. */}
      <span className={`mt-0.5 text-[11px] ${isOver ? "text-over" : "text-muted"}`}>
        {isOver ? "oltre" : "restano"}
      </span>

      <span className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-track">
        <span
          className="block h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${percent}%`,
            background: isOver ? "var(--color-over)" : MACRO_COLOR[key],
          }}
        />
      </span>

      <span className="mt-1.5 text-[11px] tabular-nums text-muted">
        {formatMacro(consumed, key)} / {target}
      </span>
    </button>
  );
}
