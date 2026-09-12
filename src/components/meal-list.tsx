"use client";

import type { Meal } from "@/db/schema";
import { formatMacro } from "@/lib/nutrition";

export function MealList({
  meals,
  onDelete,
}: {
  meals: Meal[];
  onDelete: (meal: Meal) => void;
}) {
  if (meals.length === 0) {
    return <p className="text-[15px] text-muted">Nessun pasto registrato per questa giornata.</p>;
  }

  return (
    <ul className="divide-y divide-hairline">
      {meals.map((meal) => (
        <li key={meal.id} className="flex items-center gap-2 py-1 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1 py-2">
            <p className="truncate text-[15px] font-medium">{meal.name}</p>
            <p className="mt-0.5 text-[13px] tabular-nums text-muted">
              {meal.kcal} kcal · C {formatMacro(meal.carbs, "carbs")} · P{" "}
              {formatMacro(meal.protein, "protein")} · G {formatMacro(meal.fat, "fat")}
            </p>
          </div>
          {/* 44x44: sotto questa misura si sbaglia bersaglio col pollice */}
          <button
            type="button"
            onClick={() => onDelete(meal)}
            aria-label={`Elimina ${meal.name}`}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-canvas"
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
      ))}
    </ul>
  );
}
