"use client";

import type { Meal } from "@/db/schema";
import { groupBySlot, MEAL_SLOTS, SLOT_LABELS } from "@/lib/meal-slots";
import { formatMacro, sumMacros } from "@/lib/nutrition";
import { MACRO_LABELS, MACRO_ORDER } from "@/lib/targets";

function formatQuantity(quantity: number): string | null {
  if (quantity === 1) return null;
  if (quantity === 0.5) return "½";
  if (quantity === 1.5) return "1½";
  return `${(Math.round(quantity * 100) / 100).toString().replace(".", ",")}×`;
}

/**
 * I pasti divisi per momento della giornata. Serve a capire *dove* se ne
 * vanno le calorie: un totale unico dice che hai sforato, non che il problema
 * e' la cena.
 */
export function MealList({
  meals,
  onEdit,
  onDelete,
}: {
  meals: Meal[];
  onEdit: (meal: Meal) => void;
  onDelete: (meal: Meal) => void;
}) {
  if (meals.length === 0) {
    return (
      <p className="text-[15px] text-muted">Nessun pasto registrato per questa giornata.</p>
    );
  }

  const grouped = groupBySlot(meals);

  return (
    <div className="space-y-5">
      {MEAL_SLOTS.filter((slot) => grouped[slot].length > 0).map((slot) => {
        const items = grouped[slot];
        const totals = sumMacros(items);

        return (
          <section key={slot}>
            <header className="flex items-baseline justify-between gap-2 border-b border-hairline pb-1.5">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
                {SLOT_LABELS[slot]}
              </h3>
              <span className="text-[13px] font-semibold tabular-nums text-muted">
                {formatMacro(totals.kcal, "kcal")} kcal
              </span>
            </header>

            <ul className="divide-y divide-hairline">
              {items.map((meal) => {
                const quantity = formatQuantity(meal.quantity);
                return (
                  <li key={meal.id} className="flex items-center gap-2 py-1">
                    <button
                      type="button"
                      onClick={() => onEdit(meal)}
                      aria-label={`Modifica ${meal.name}`}
                      className="min-w-0 flex-1 py-1.5 text-left active:opacity-60"
                    >
                      <p className="truncate text-[15px] font-medium">
                        {meal.name}
                        {quantity ? (
                          <span className="ml-1.5 rounded bg-raised px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-muted">
                            {quantity}
                          </span>
                        ) : null}
                      </p>
                      {/*
                        Pallini colorati invece delle sigle C/P/G: sono gli
                        stessi colori dei macro in tutta l'app, mentre le
                        iniziali non dicono niente a chi non le conosce. Il
                        nome per esteso resta nell'etichetta accessibile.
                      */}
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] tabular-nums text-muted">
                        <span>{meal.kcal} kcal</span>
                        {MACRO_ORDER.slice(1).map((key) => (
                          <span key={key} className="flex items-center gap-1">
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: `var(--color-${key})` }}
                            />
                            <span className="sr-only">{MACRO_LABELS[key]} </span>
                            {formatMacro(meal[key], key)}
                          </span>
                        ))}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(meal)}
                      aria-label={`Elimina ${meal.name}`}
                      className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-raised"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                        <path
                          d="M3 5h12M7.5 5V3.5h3V5M6 5l.6 9.5h4.8L12 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
