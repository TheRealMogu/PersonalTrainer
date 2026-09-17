"use client";

import type { Meal, QuickFood } from "@/db/schema";
import { formatMacro, type MacroProgress } from "@/lib/nutrition";
import { MACRO_LABELS, MACRO_UNITS, type MacroKey } from "@/lib/targets";

/** Quanti alimenti proporre: oltre diventa una lista da leggere, non una risposta. */
const MAX_PROPOSTE = 4;

/** Da qui in su si smette di contare le porzioni e si dice che ci sta e basta. */
const TROPPE = 10;

/**
 * Dettaglio di un macro: da dove arriva quello che hai gia' mangiato, e cosa
 * ci sta ancora in quello che resta.
 *
 * La seconda meta' e' il motivo per cui esiste: sapere di avere 142 g di
 * proteine da spendere non aiuta, sapere che sono due petti di pollo si'.
 * Il conto lo fa l'app, che i numeri ce li ha gia'.
 */
export function MacroSheet({
  progress,
  meals,
  foods,
  onClose,
}: {
  progress: MacroProgress;
  meals: Meal[];
  foods: QuickFood[];
  onClose: () => void;
}) {
  const key = progress.key as MacroKey;
  const unit = MACRO_UNITS[key];

  // Solo i pasti che contribuiscono, dal piu' grande: gli altri sono rumore.
  const contributi = meals
    .filter((meal) => meal[key] > 0)
    .sort((a, b) => b[key] - a[key]);

  const proposte = progress.isOver
    ? []
    : foods
        .filter((food) => food[key] > 0 && food[key] <= progress.remaining)
        .sort((a, b) => b[key] - a[key])
        .slice(0, MAX_PROPOSTE)
        .map((food) => ({
          food,
          // Quante porzioni ci stanno ancora, arrotondate per difetto.
          quante: Math.floor(progress.remaining / food[key]),
        }));

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 animate-velo bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Dettaglio ${MACRO_LABELS[key]}`}
        className="relative animate-foglio mx-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface px-5 pt-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <header className="mb-4">
          <h2 className="text-[20px] font-bold leading-tight tracking-tight">
            {MACRO_LABELS[key]}
          </h2>
          <p className={`mt-0.5 text-[15px] ${progress.isOver ? "text-over" : "text-muted"}`}>
            {progress.isOver
              ? `${formatMacro(progress.over, key)} ${unit} oltre il target di ${formatMacro(progress.target, key)}`
              : `Restano ${formatMacro(progress.remaining, key)} ${unit} su ${formatMacro(progress.target, key)}`}
          </p>
        </header>

        <section className="mb-5">
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
            Da dove arriva
          </h3>
          {contributi.length === 0 ? (
            <p className="text-[15px] text-muted">
              Niente ancora: non hai registrato pasti che ne contengono.
            </p>
          ) : (
            <ul className="divide-y divide-hairline">
              {contributi.map((meal) => (
                <li key={meal.id} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="min-w-0 flex-1 text-[15px] leading-snug">
                    {meal.name}
                    {meal.quantity !== 1 ? (
                      <span className="text-muted"> ×{formatMacro(meal.quantity, "carbs")}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                    {formatMacro(meal[key], key)} {unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {proposte.length > 0 ? (
          <section>
            <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
              Cosa ci sta ancora
            </h3>
            <ul className="divide-y divide-hairline">
              {proposte.map(({ food, quante }) => (
                <li key={food.id} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="min-w-0 flex-1 text-[15px] leading-snug">{food.name}</span>
                  <span className="shrink-0 text-[15px] tabular-nums text-muted">
                    {quante >= TROPPE ? (
                      // "fino a 24 porzioni" e' vero e inutile: sopra questa
                      // soglia il numero preciso non aiuta a decidere niente.
                      "ci sta senza problemi"
                    ) : quante > 1 ? (
                      <>
                        fino a <strong className="font-semibold text-ink">{quante}</strong> porzioni
                      </>
                    ) : (
                      <>
                        <strong className="font-semibold text-ink">1</strong> porzione
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-snug text-muted">
              Conta solo {MACRO_LABELS[key].toLowerCase()}: un alimento che ci sta qui potrebbe
              far sforare un altro macro.
            </p>
          </section>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-11 w-full rounded-xl border border-hairline text-[15px] font-medium text-muted tocco active:bg-raised"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
