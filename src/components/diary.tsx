"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addMeal,
  deleteMeal,
  restoreMeal,
  updateMealQuantity,
  type MealInput,
} from "@/app/actions";
import type { Meal, QuickFood } from "@/db/schema";
import type { MealSlot } from "@/lib/meal-slots";
import { buildProgress, sumMacros } from "@/lib/nutrition";
import type { MacroKey } from "@/lib/targets";
import { Card } from "./card";
import { CalorieRing } from "./calorie-ring";
import { EditMealSheet } from "./edit-meal-sheet";
import { MacroSheet } from "./macro-sheet";
import { MacroTile } from "./macro-tile";
import { ManualMealForm } from "./manual-meal-form";
import { MealList } from "./meal-list";
import { QuickFoods } from "./quick-foods";
import { UndoToast } from "./undo-toast";

type OptimisticAction =
  | { type: "add"; meal: Meal }
  | { type: "remove"; id: number }
  | { type: "restore"; meal: Meal }
  | { type: "replace"; meal: Meal };

/** Secondi in cui resta disponibile l'annullamento di un'eliminazione. */
const UNDO_SECONDS = 6;

/**
 * Cuore del diario. Tiene lo stato ottimistico cosi' il riepilogo e la lista
 * si aggiornano al tocco: su rete lenta il salvataggio richiede un secondo, e
 * senza riscontro immediato si finisce per toccare due volte e registrare
 * due porzioni.
 */
export function Diary({
  day,
  meals,
  quickFoods,
  defaultSlot,
}: {
  day: string;
  meals: Meal[];
  quickFoods: QuickFood[];
  defaultSlot: MealSlot;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [undoable, setUndoable] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [macroAperto, setMacroAperto] = useState<MacroKey | null>(null);
  const tempId = useRef(-1);

  const [optimisticMeals, applyOptimistic] = useOptimistic(
    meals,
    (state: Meal[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.meal];
        case "remove":
          return state.filter((meal) => meal.id !== action.id);
        case "replace":
          return state.map((meal) => (meal.id === action.meal.id ? action.meal : meal));
        case "restore":
          return [...state, action.meal].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
          );
      }
    },
  );

  const totals = sumMacros(optimisticMeals);
  const progress = buildProgress(totals);

  function handleAdd(input: Omit<MealInput, "day">) {
    setError(null);
    startTransition(async () => {
      applyOptimistic({
        type: "add",
        meal: { id: tempId.current--, day, createdAt: new Date(), ...input },
      });

      const result = await addMeal({ day, ...input });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(meal: Meal) {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: meal.id });

      const result = await deleteMeal(meal.id, day);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUndoable(meal);
      router.refresh();
    });
  }

  function handleEdit(meal: Meal, quantity: number) {
    setEditing(null);
    setError(null);
    startTransition(async () => {
      const factor = quantity / meal.quantity;
      applyOptimistic({
        type: "replace",
        meal: {
          ...meal,
          quantity,
          kcal: Math.round(meal.kcal * factor),
          carbs: meal.carbs * factor,
          protein: meal.protein * factor,
          fat: meal.fat * factor,
        },
      });

      const result = await updateMealQuantity(meal.id, day, quantity);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleUndo(meal: Meal) {
    setUndoable(null);
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "restore", meal });

      const result = await restoreMeal({
        day: meal.day,
        slot: meal.slot as MealSlot,
        name: meal.name,
        quantity: meal.quantity,
        kcal: meal.kcal,
        carbs: meal.carbs,
        protein: meal.protein,
        fat: meal.fat,
        createdAt: meal.createdAt.toISOString(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CalorieRing progress={progress[0]} />
        {/*
          Tre riquadri affiancati invece di tre barre impilate: la domanda
          "quanto mi resta" si legge tutta insieme, e ognuno si tocca per
          sapere da dove arriva e cosa ci sta ancora.
        */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-4">
          {progress.slice(1).map((item) => (
            <MacroTile key={item.key} progress={item} onOpen={setMacroAperto} />
          ))}
        </div>
      </Card>

      <Card title={`Pasti (${optimisticMeals.length})`}>
        <MealList
          meals={optimisticMeals}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
      </Card>

      <Card title="Aggiungi">
        <QuickFoods
          foods={quickFoods}
          defaultSlot={defaultSlot}
          totals={totals}
          onAdd={(food, quantity, slot) =>
            handleAdd({
              slot,
              name: food.name,
              quantity,
              kcal: food.kcal * quantity,
              carbs: food.carbs * quantity,
              protein: food.protein * quantity,
              fat: food.fat * quantity,
            })
          }
        />
        <div className="mt-4 border-t border-hairline pt-4">
          <ManualMealForm defaultSlot={defaultSlot} onAdd={handleAdd} />
        </div>
      </Card>

      {error ? (
        <p role="alert" className="mb-4 px-1 text-[13px] text-over">
          {error}
        </p>
      ) : null}

      {editing ? (
        <EditMealSheet
          meal={editing}
          onConfirm={(quantity) => handleEdit(editing, quantity)}
          onDelete={() => {
            const meal = editing;
            setEditing(null);
            handleDelete(meal);
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {macroAperto ? (
        <MacroSheet
          progress={progress.find((item) => item.key === macroAperto)!}
          meals={optimisticMeals}
          foods={quickFoods}
          onClose={() => setMacroAperto(null)}
        />
      ) : null}

      {undoable ? (
        <UndoToast
          key={undoable.id}
          message={`"${undoable.name}" eliminato`}
          seconds={UNDO_SECONDS}
          onUndo={() => handleUndo(undoable)}
          onDismiss={() => setUndoable(null)}
        />
      ) : null}
    </>
  );
}
