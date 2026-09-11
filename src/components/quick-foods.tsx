"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { addMeal } from "@/app/actions";
import type { QuickFood } from "@/db/schema";

export function QuickFoods({ day, foods }: { day: string; foods: QuickFood[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAdd(food: QuickFood) {
    setBusyId(food.id);
    setError(null);
    startTransition(async () => {
      const result = await addMeal({
        day,
        name: food.name,
        kcal: food.kcal,
        carbs: food.carbs,
        protein: food.protein,
        fat: food.fat,
      });
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (foods.length === 0) {
    return (
      <p className="text-[15px] text-muted">
        Nessun tasto rapido: lancia <code>npm run db:seed</code> per caricarli.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {foods.map((food) => (
          <button
            key={food.id}
            type="button"
            onClick={() => handleAdd(food)}
            disabled={pending}
            className="rounded-xl border border-hairline px-3 py-3 text-left transition active:scale-[0.98] active:bg-canvas disabled:opacity-50"
          >
            <span className="block text-[15px] font-medium leading-tight">
              {busyId === food.id ? "Aggiungo…" : food.name}
            </span>
            {food.portion ? (
              <span className="mt-0.5 block text-[12px] leading-tight text-muted">
                {food.portion}
              </span>
            ) : null}
            <span className="mt-1.5 block text-[12px] tabular-nums text-muted">
              {food.kcal} kcal · C {food.carbs} · P {food.protein} · G {food.fat}
            </span>
          </button>
        ))}
      </div>
      {error ? <p className="mt-3 text-[13px] text-over">{error}</p> : null}
    </div>
  );
}
