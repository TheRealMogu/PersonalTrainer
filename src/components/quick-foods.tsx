"use client";

import { useRef, useState } from "react";
import type { QuickFood } from "@/db/schema";
import type { MealSlot } from "@/lib/meal-slots";
import { QuantitySheet } from "./quantity-sheet";

/** Oltre questa soglia il tocco e' "tenuto premuto" e apre le quantita'. */
const LONG_PRESS_MS = 400;

/**
 * Tasti rapidi. Un tocco aggiunge una porzione (il caso normale, un gesto
 * solo); tenendo premuto si sceglie quanto e in che momento della giornata,
 * senza passare dal form manuale.
 */
export function QuickFoods({
  foods,
  defaultSlot,
  onAdd,
}: {
  foods: QuickFood[];
  defaultSlot: MealSlot;
  onAdd: (food: QuickFood, quantity: number, slot: MealSlot) => void;
}) {
  const [sheetFor, setSheetFor] = useState<QuickFood | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function startPress(food: QuickFood) {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      setSheetFor(food);
    }, LONG_PRESS_MS);
  }

  function endPress() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  if (foods.length === 0) {
    return (
      <p className="text-[15px] text-muted">
        Nessun tasto rapido: lancia <code>npm run db:seed</code> per caricarli.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 items-stretch gap-2">
        {foods.map((food) => (
          <div key={food.id} className="relative">
            <button
              type="button"
              onPointerDown={() => startPress(food)}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onContextMenu={(event) => event.preventDefault()}
              onClick={() => {
                // Il click arriva anche dopo un tocco lungo: li' ha gia'
                // aperto il foglio, quindi non si aggiunge due volte.
                if (longPressed.current) return;
                onAdd(food, 1, defaultSlot);
              }}
              className="flex min-h-16 w-full flex-col justify-between rounded-xl border border-hairline bg-surface px-3 py-2.5 pr-10 text-left transition active:scale-[0.98] active:bg-raised"
            >
              <span className="text-[15px] font-medium leading-tight">{food.name}</span>
              <span className="mt-1.5 text-[13px] tabular-nums text-muted">{food.kcal} kcal</span>
            </button>

            {/* Bersaglio esplicito per le quantita': il tocco lungo non si scopre da solo. */}
            <button
              type="button"
              onClick={() => setSheetFor(food)}
              aria-label={`Scegli quantità per ${food.name}`}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-muted active:text-accent"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M9 4.5v9M4.5 9h9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {sheetFor ? (
        <QuantitySheet
          food={sheetFor}
          defaultSlot={defaultSlot}
          onConfirm={(quantity, slot) => {
            onAdd(sheetFor, quantity, slot);
            setSheetFor(null);
          }}
          onClose={() => setSheetFor(null)}
        />
      ) : null}
    </>
  );
}
