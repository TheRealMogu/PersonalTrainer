"use client";

import { useState } from "react";
import type { MealInput } from "@/app/actions";
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from "@/lib/meal-slots";

const EMPTY = { name: "", kcal: "", carbs: "", protein: "", fat: "" };

type Field = keyof typeof EMPTY;

const NUMERIC_FIELDS: { field: Field; label: string; unit: string }[] = [
  { field: "kcal", label: "Calorie", unit: "kcal" },
  { field: "carbs", label: "Carboidrati", unit: "g" },
  { field: "protein", label: "Proteine", unit: "g" },
  { field: "fat", label: "Grassi", unit: "g" },
];

/** Accetta sia la virgola che il punto come separatore decimale. */
function parseNumber(value: string): number {
  if (value.trim() === "") return 0;
  return Number(value.replace(",", "."));
}

export function ManualMealForm({
  defaultSlot,
  onAdd,
}: {
  defaultSlot: MealSlot;
  onAdd: (meal: Omit<MealInput, "day">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.name.trim()) {
      setError("Il nome del pasto è obbligatorio.");
      return;
    }

    const numbers = {
      kcal: parseNumber(values.kcal),
      carbs: parseNumber(values.carbs),
      protein: parseNumber(values.protein),
      fat: parseNumber(values.fat),
    };
    if (Object.values(numbers).some((value) => !Number.isFinite(value) || value < 0)) {
      setError("I valori devono essere numeri non negativi.");
      return;
    }

    setError(null);
    onAdd({ slot, name: values.name, quantity: 1, ...numbers });
    setValues(EMPTY);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 w-full rounded-xl border border-dashed border-hairline py-3 text-[15px] font-medium text-accent active:bg-raised"
      >
        Aggiungi manualmente
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-[13px] text-muted">Nome</span>
        <input
          type="text"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="Es. Insalata di pollo"
          required
          maxLength={120}
          autoFocus
          className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>

      <div className="flex gap-2">
        {MEAL_SLOTS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSlot(value)}
            className={`h-11 flex-1 rounded-xl text-[13px] font-medium transition-colors ${
              slot === value
                ? "bg-accent text-on-accent"
                : "border border-hairline bg-raised text-muted"
            }`}
          >
            {SLOT_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {NUMERIC_FIELDS.map(({ field, label, unit }) => (
          <label key={field} className="block">
            <span className="mb-1 block text-[13px] text-muted">
              {label} ({unit})
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={values[field]}
              onChange={(event) => update(field, event.target.value)}
              placeholder="0"
              className="min-h-11 w-full rounded-xl border border-hairline bg-raised px-3 py-2.5 tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </label>
        ))}
      </div>

      {error ? <p className="text-[13px] text-over">{error}</p> : null}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="min-h-11 flex-1 rounded-xl bg-accent py-3 text-[15px] font-semibold text-on-accent active:opacity-80"
        >
          Salva
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setValues(EMPTY);
            setError(null);
          }}
          className="min-h-11 rounded-xl border border-hairline px-5 text-[15px] font-medium text-muted active:bg-raised"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
