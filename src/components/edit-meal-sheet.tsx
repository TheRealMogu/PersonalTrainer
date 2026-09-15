"use client";

import { useState } from "react";
import type { Meal } from "@/db/schema";
import { formatMacro } from "@/lib/nutrition";

const PRESETS = [0.5, 1, 1.5, 2];

/**
 * Correzione di un pasto gia' inserito. Si cambia la quantita' e i macro
 * seguono: e' il caso vero (ne ho mangiata meta', non una intera), e costa
 * due tocchi invece di eliminare e reinserire da capo.
 */
export function EditMealSheet({
  meal,
  onConfirm,
  onDelete,
  onClose,
}: {
  meal: Meal;
  onConfirm: (quantity: number) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(meal.quantity);
  const [custom, setCustom] = useState("");

  const effective = custom.trim() === "" ? quantity : Number(custom.replace(",", "."));
  const valid = Number.isFinite(effective) && effective > 0 && effective <= 20;

  // Dalla porzione base si ricalcola tutto: i macro salvati sono gia' scalati.
  const factor = valid ? effective / meal.quantity : 0;
  const scaled = {
    kcal: meal.kcal * factor,
    carbs: meal.carbs * factor,
    protein: meal.protein * factor,
    fat: meal.fat * factor,
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Modifica ${meal.name}`}
        className="relative mx-auto w-full max-w-md rounded-t-3xl bg-surface px-5 pt-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <header className="mb-4">
          <h2 className="text-[20px] font-bold leading-tight tracking-tight">{meal.name}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Registrato come {formatMacro(meal.kcal, "kcal")} kcal
          </p>
        </header>

        <p className="mb-2 text-[13px] text-muted">Quantità</p>
        <div className="flex gap-2">
          {PRESETS.map((value) => {
            const active = custom.trim() === "" && quantity === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setQuantity(value);
                  setCustom("");
                }}
                className={`h-12 flex-1 rounded-xl text-[15px] font-semibold tabular-nums transition-colors ${
                  active
                    ? "bg-accent text-on-accent"
                    : "border border-hairline bg-raised text-ink"
                }`}
              >
                {value === 0.5 ? "½" : value === 1.5 ? "1½" : value}
              </button>
            );
          })}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-[13px] text-muted">Oppure scrivi quante porzioni</span>
          <input
            type="text"
            inputMode="decimal"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="es. 0,75"
            className="h-12 w-full rounded-xl border border-hairline bg-raised px-3 text-center text-[17px] font-semibold tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </label>

        <div className="mt-4 rounded-xl bg-raised px-4 py-3">
          <p className="text-[15px] font-semibold tabular-nums">
            {valid ? formatMacro(scaled.kcal, "kcal") : "—"} kcal
          </p>
          <p className="mt-0.5 text-[13px] tabular-nums text-muted">
            C {valid ? formatMacro(scaled.carbs, "carbs") : "—"} · P{" "}
            {valid ? formatMacro(scaled.protein, "protein") : "—"} · G{" "}
            {valid ? formatMacro(scaled.fat, "fat") : "—"}
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="min-h-12 rounded-xl border border-hairline px-5 text-[15px] font-medium text-muted"
          >
            Elimina
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onConfirm(effective)}
            className="min-h-12 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-on-accent active:opacity-80 disabled:opacity-40"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
