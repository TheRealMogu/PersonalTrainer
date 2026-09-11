"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMeal } from "@/app/actions";

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

export function ManualMealForm({ day }: { day: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await addMeal({
        day,
        name: values.name,
        kcal: parseNumber(values.kcal),
        carbs: parseNumber(values.carbs),
        protein: parseNumber(values.protein),
        fat: parseNumber(values.fat),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setValues(EMPTY);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-hairline py-3 text-[15px] font-medium text-accent active:bg-canvas"
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
          className="w-full rounded-xl border border-hairline bg-canvas px-3 py-2.5 outline-none focus:border-accent"
        />
      </label>

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
              className="w-full rounded-xl border border-hairline bg-canvas px-3 py-2.5 tabular-nums outline-none focus:border-accent"
            />
          </label>
        ))}
      </div>

      {error ? <p className="text-[13px] text-over">{error}</p> : null}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-accent py-3 text-[15px] font-semibold text-white active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Salvo…" : "Salva"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setValues(EMPTY);
            setError(null);
          }}
          className="rounded-xl border border-hairline px-5 text-[15px] font-medium text-muted active:bg-canvas"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
