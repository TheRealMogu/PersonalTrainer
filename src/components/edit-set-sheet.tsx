"use client";

import { useState } from "react";
import { formatWeight, parseWeight, type LoggedSet } from "@/lib/workout";

/**
 * Correzione di una serie gia' registrata.
 *
 * In palestra si digita con le mani sudate e di fretta: 50 invece di 60, 8
 * invece di 10. Prima l'unica strada era eliminare e riscrivere, e
 * l'eliminazione non si annullava -- quindi un tocco storto costava la serie.
 */
export function EditSetSheet({
  set,
  exerciseName,
  onConfirm,
  onDelete,
  onClose,
}: {
  set: LoggedSet;
  exerciseName: string;
  onConfirm: (weight: number, reps: number) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [weight, setWeight] = useState(formatWeight(set.weight));
  const [reps, setReps] = useState(String(set.reps));

  // Stessi limiti dell'azione sul server: qui servono solo a spegnere
  // "Salva" prima del viaggio, non a fidarsi del client.
  const peso = parseWeight(weight);
  const ripetizioni = Number(reps);
  const valid =
    weight.trim() !== "" &&
    Number.isFinite(peso) &&
    peso >= 0 &&
    peso <= 600 &&
    Number.isInteger(ripetizioni) &&
    ripetizioni > 0 &&
    ripetizioni <= 200;

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
        aria-label={`Modifica serie ${set.setNumber} di ${exerciseName}`}
        className="relative mx-auto w-full max-w-md rounded-t-3xl bg-surface px-5 pt-5"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <header className="mb-4">
          <h2 className="text-[20px] font-bold leading-tight tracking-tight">
            Serie {set.setNumber}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">{exerciseName}</p>
        </header>

        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[13px] text-muted">kg</span>
            <input
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              aria-label="Carico"
              className="h-12 w-full rounded-xl border border-hairline bg-raised px-3 text-center text-[17px] font-semibold tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[13px] text-muted">ripetizioni</span>
            <input
              type="text"
              inputMode="numeric"
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              aria-label="Ripetizioni"
              className="h-12 w-full rounded-xl border border-hairline bg-raised px-3 text-center text-[17px] font-semibold tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </label>
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
            onClick={() => onConfirm(peso, ripetizioni)}
            className="min-h-12 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-on-accent active:opacity-80 disabled:opacity-40"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
