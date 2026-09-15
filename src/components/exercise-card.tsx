"use client";

import { useState } from "react";
import type { WorkoutExercise } from "@/db/schema";
import {
  formatWeight,
  parseWeight,
  suggestNextSet,
  type LoggedSet,
} from "@/lib/workout";

/**
 * Un esercizio della seduta: le serie gia' fatte e la riga per aggiungerne
 * una. I campi partono gia' compilati col carico dell'ultima serie, cosi'
 * segnare una serie uguale alla precedente e' un tocco solo.
 */
export function ExerciseCard({
  exercise,
  sets,
  lastTime,
  onLog,
  onDelete,
  disabled,
}: {
  exercise: WorkoutExercise;
  sets: LoggedSet[];
  lastTime: LoggedSet[];
  onLog: (weight: number, reps: number) => void;
  onDelete: (setId: number) => void;
  disabled: boolean;
}) {
  const suggestion = suggestNextSet(sets, lastTime);
  const [weight, setWeight] = useState(suggestion ? formatWeight(suggestion.weight) : "");
  const [reps, setReps] = useState(suggestion ? String(suggestion.reps) : "");
  const [error, setError] = useState<string | null>(null);

  const done = sets.length;
  const planned = exercise.sets;

  function handleLog() {
    const parsedWeight = parseWeight(weight);
    const parsedReps = Number(reps);

    if (!Number.isInteger(parsedReps) || parsedReps < 1) {
      setError("Metti quante ripetizioni hai fatto.");
      return;
    }
    if (!Number.isFinite(parsedWeight) || parsedWeight < 0) {
      setError("Carico non valido.");
      return;
    }

    setError(null);
    onLog(parsedWeight, parsedReps);
  }

  return (
    <section className="mb-3 rounded-2xl bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{exercise.name}</h3>
        <span className="shrink-0 text-[13px] tabular-nums text-muted">
          {done}/{planned} × {exercise.reps}
        </span>
      </header>

      {lastTime.length > 0 ? (
        <p className="mt-1 text-[13px] text-muted">
          Ultima volta: {lastTime.map((s) => `${formatWeight(s.weight)}×${s.reps}`).join(" · ")}
        </p>
      ) : null}

      {sets.length > 0 ? (
        <ul className="mt-3 divide-y divide-hairline">
          {sets.map((set) => (
            <li key={set.id} className="flex items-center gap-3 py-2">
              <span className="w-5 shrink-0 text-[13px] tabular-nums text-muted">
                {set.setNumber}
              </span>
              <span className="flex-1 text-[15px] tabular-nums">
                <strong className="font-semibold">{formatWeight(set.weight)}</strong> kg ×{" "}
                <strong className="font-semibold">{set.reps}</strong>
                {/* Non e' un errore: la serie c'e', deve solo ancora partire. */}
                {set.inAttesa ? (
                  <span className="ml-2 text-[13px] font-normal text-muted">da mandare</span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => onDelete(set.id)}
                aria-label={`Elimina serie ${set.setNumber} di ${exercise.name}`}
                disabled={disabled}
                className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-raised disabled:opacity-40"
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M3 5h12M7.5 5V3.5h3V5M6 5l.6 9.5h4.8L12 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[12px] text-muted">kg</span>
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder="0"
            aria-label={`Carico per ${exercise.name}`}
            className="h-11 w-full rounded-xl border border-hairline bg-raised px-3 text-center text-[17px] font-semibold tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </label>

        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[12px] text-muted">ripetizioni</span>
          <input
            type="text"
            inputMode="numeric"
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            placeholder={exercise.reps}
            aria-label={`Ripetizioni per ${exercise.name}`}
            className="h-11 w-full rounded-xl border border-hairline bg-raised px-3 text-center text-[17px] font-semibold tabular-nums outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </label>

        <button
          type="button"
          onClick={handleLog}
          disabled={disabled}
          aria-label={`Segna la serie di ${exercise.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent active:opacity-80 disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="m4.5 10.5 3.5 3.5 7.5-8"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-over">
          {error}
        </p>
      ) : null}
    </section>
  );
}
