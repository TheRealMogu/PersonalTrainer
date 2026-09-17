"use client";

import { useState } from "react";
import type { QuickFood } from "@/db/schema";
import { formatMacro } from "@/lib/nutrition";
import { MEAL_SLOTS, SLOT_LABELS, type MealSlot } from "@/lib/meal-slots";

/** Le quantita' che servono davvero: mezza, una, una e mezza, due. */
const PRESETS = [0.5, 1, 1.5, 2];

/**
 * Foglio della quantita'. Il diario serve proprio per i giorni storti — mezza
 * porzione, il bis — e finora quei casi costavano il form manuale con cinque
 * campi. Qui la porzione base e' gia' scelta: confermare e' un tocco.
 */
export function QuantitySheet({
  food,
  defaultSlot,
  onConfirm,
  onClose,
}: {
  food: QuickFood;
  defaultSlot: MealSlot;
  onConfirm: (quantity: number, slot: MealSlot) => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [custom, setCustom] = useState("");
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);

  const effective = custom.trim() === "" ? quantity : Number(custom.replace(",", "."));
  const valid = Number.isFinite(effective) && effective > 0 && effective <= 20;

  const scaled = {
    kcal: food.kcal * (valid ? effective : 0),
    carbs: food.carbs * (valid ? effective : 0),
    protein: food.protein * (valid ? effective : 0),
    fat: food.fat * (valid ? effective : 0),
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 animate-velo bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Quantità per ${food.name}`}
        className="relative animate-foglio mx-auto w-full max-w-md rounded-t-3xl bg-surface px-5 pt-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <header className="mb-4">
          <h2 className="text-[20px] font-bold leading-tight tracking-tight">{food.name}</h2>
          {food.portion ? (
            <p className="mt-0.5 text-[13px] text-muted">1 porzione = {food.portion}</p>
          ) : null}
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
                className={`h-12 flex-1 rounded-xl text-[15px] font-semibold tabular-nums transition-colors duration-200 ease-ios ${
                  active
                    ? "bg-accent-solid text-on-accent"
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

        <p className="mt-4 mb-2 text-[13px] text-muted">Quando</p>
        <div className="flex gap-2">
          {MEAL_SLOTS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSlot(value)}
              className={`h-11 flex-1 rounded-xl text-[13px] font-medium transition-colors duration-200 ease-ios ${
                slot === value
                  ? "bg-accent-solid text-on-accent"
                  : "border border-hairline bg-raised text-muted"
              }`}
            >
              {SLOT_LABELS[value]}
            </button>
          ))}
        </div>

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
            onClick={onClose}
            className="min-h-12 rounded-xl border border-hairline px-5 text-[15px] font-medium text-muted"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onConfirm(effective, slot)}
            className="min-h-12 flex-1 rounded-xl bg-accent-solid text-[15px] font-semibold text-on-accent tocco active:opacity-80 disabled:opacity-40"
          >
            Aggiungi
          </button>
        </div>
      </div>
    </div>
  );
}
