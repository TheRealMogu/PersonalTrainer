"use client";

import { useState } from "react";
import type { WorkoutExercise } from "@/db/schema";
import {
  caricoPerManubrio,
  confrontaSerie,
  etichettaCarico,
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
  onEdit,
  onDelete,
  onSposta,
  puoSalire,
  puoScendere,
  disabled,
}: {
  exercise: WorkoutExercise;
  sets: LoggedSet[];
  lastTime: LoggedSet[];
  onLog: (weight: number, reps: number) => void;
  onEdit: (set: LoggedSet) => void;
  onDelete: (setId: number) => void;
  /** Sposta la scheda di un posto, su (-1) o giù (1), solo per questa seduta. */
  onSposta: (direzione: -1 | 1) => void;
  puoSalire: boolean;
  puoScendere: boolean;
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

      {/*
        Solo per oggi: se la macchina è occupata si sposta la scheda più giù
        senza toccare il programma. Niente da scrivere sul server, quindi
        niente da annullare -- basta ritoccarla. Sparisce da sola quando c'è
        un solo esercizio, dove spostare non vorrebbe dire niente.
      */}
      {puoSalire || puoScendere ? (
        <div className="mt-1 flex justify-end gap-1">
          <button
            type="button"
            onClick={() => onSposta(-1)}
            disabled={disabled || !puoSalire}
            aria-label={`Sposta ${exercise.name} più su, solo per questa seduta`}
            className="flex h-11 w-11 items-center justify-center rounded-full tocco active:bg-raised disabled:opacity-30"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2 9.5 7 4.5l5 5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onSposta(1)}
            disabled={disabled || !puoScendere}
            aria-label={`Sposta ${exercise.name} più giù, solo per questa seduta`}
            className="flex h-11 w-11 items-center justify-center rounded-full tocco active:bg-raised disabled:opacity-30"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2 4.5 7 9.5l5-5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : null}

      {lastTime.length > 0 ? (
        <p className="mt-1 text-[13px] text-muted">
          Ultima volta: {lastTime.map((s) => `${formatWeight(s.weight)}×${s.reps}`).join(" · ")}
        </p>
      ) : (
        <p className="mt-1 text-[13px] text-muted">Prima volta su questo esercizio.</p>
      )}

      {sets.length > 0 ? (
        <ul className="mt-3 divide-y divide-hairline">
          {sets.map((set) => {
            const confronto = confrontaSerie(set, lastTime);
            return (
            <li key={set.id} className="flex items-center gap-1 py-1">
              {/*
                La riga si tocca e si corregge. Prima l'unico modo di
                rimediare a un carico digitato male era eliminare e
                riscrivere, e l'eliminazione non si annullava.
              */}
              <button
                type="button"
                onClick={() => onEdit(set)}
                disabled={disabled || set.inAttesa}
                aria-label={`Modifica serie ${set.setNumber} di ${exercise.name}`}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 text-left tocco active:bg-raised disabled:opacity-100"
              >
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
                {/*
                  Quanto sei andato meglio o peggio della stessa serie
                  dell'ultima volta. E' la domanda che ti fai davvero fra una
                  serie e l'altra, e prima la dovevi fare a mente leggendo la
                  riga "Ultima volta" in cima. Senza colore: una serie piu'
                  leggera non e' un guasto ne' un fuori target.
                */}
                {confronto ? (
                  <span className="shrink-0 pr-1 text-[13px] tabular-nums text-muted">
                    {confronto.testo}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => onDelete(set.id)}
                aria-label={`Elimina serie ${set.setNumber} di ${exercise.name}`}
                disabled={disabled}
                className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full tocco active:bg-raised disabled:opacity-40"
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
            );
          })}
        </ul>
      ) : null}

      <div className="mt-3 flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[12px] text-muted">
            {etichettaCarico(exercise.name)}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder="0"
            aria-label={
              caricoPerManubrio(exercise.name)
                ? `Carico di un manubrio per ${exercise.name}`
                : `Carico per ${exercise.name}`
            }
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-solid text-on-accent tocco active:opacity-80 disabled:opacity-50"
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
