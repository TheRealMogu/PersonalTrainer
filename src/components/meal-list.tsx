"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMeal } from "@/app/actions";
import type { Meal } from "@/db/schema";
import { formatMacro } from "@/lib/nutrition";

export function MealList({ day, meals }: { day: string; meals: Meal[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: number) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const result = await deleteMeal(id, day);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (meals.length === 0) {
    return <p className="text-[15px] text-muted">Nessun pasto registrato per questa giornata.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-hairline">
        {meals.map((meal) => (
          <li key={meal.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{meal.name}</p>
              <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                {meal.kcal} kcal · C {formatMacro(meal.carbs, "carbs")} · P{" "}
                {formatMacro(meal.protein, "protein")} · G {formatMacro(meal.fat, "fat")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(meal.id)}
              disabled={pending}
              aria-label={`Elimina ${meal.name}`}
              className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-medium text-over active:bg-canvas disabled:opacity-40"
            >
              {busyId === meal.id ? "…" : "Elimina"}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-[13px] text-over">{error}</p> : null}
    </div>
  );
}
