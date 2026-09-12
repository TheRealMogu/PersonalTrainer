"use client";

import type { QuickFood } from "@/db/schema";
import type { MealInput } from "@/app/actions";

/**
 * Tasti rapidi: nome e calorie, niente altro. Il dettaglio dei macro serve a
 * scegliere una volta, non a ogni tocco, e riempiva mezza schermata spingendo
 * la lista dei pasti fuori dalla vista.
 */
export function QuickFoods({
  foods,
  onAdd,
}: {
  foods: QuickFood[];
  onAdd: (meal: Omit<MealInput, "day">) => void;
}) {
  if (foods.length === 0) {
    return (
      <p className="text-[15px] text-muted">
        Nessun tasto rapido: lancia <code>npm run db:seed</code> per caricarli.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 items-stretch gap-2">
      {foods.map((food) => (
        <button
          key={food.id}
          type="button"
          onClick={() =>
            onAdd({
              name: food.name,
              kcal: food.kcal,
              carbs: food.carbs,
              protein: food.protein,
              fat: food.fat,
            })
          }
          title={
            food.portion
              ? `${food.portion} — C ${food.carbs} · P ${food.protein} · G ${food.fat}`
              : `C ${food.carbs} · P ${food.protein} · G ${food.fat}`
          }
          className="flex min-h-11 flex-col justify-between rounded-xl border border-hairline px-3 py-2.5 text-left transition active:scale-[0.98] active:bg-canvas"
        >
          <span className="text-[15px] font-medium leading-tight">{food.name}</span>
          <span className="mt-1.5 text-[13px] tabular-nums text-muted">{food.kcal} kcal</span>
        </button>
      ))}
    </div>
  );
}
