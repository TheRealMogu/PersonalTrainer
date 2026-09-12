"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSet, endSession, logSet } from "@/app/allenamento/actions";
import type { WorkoutExercise, WorkoutSession as Session } from "@/db/schema";
import { formatVolume, groupByExercise, totalVolume, type LoggedSet } from "@/lib/workout";
import { ExerciseCard } from "./exercise-card";
import { RestTimer } from "./rest-timer";
import { SessionTimer } from "./session-timer";

type OptimisticAction = { type: "add"; set: LoggedSet } | { type: "remove"; id: number };

export function WorkoutSession({
  session,
  label,
  focus,
  exercises,
  sets,
  lastTime,
}: {
  session: Session;
  label: string;
  focus: string;
  exercises: WorkoutExercise[];
  sets: LoggedSet[];
  lastTime: Record<number, LoggedSet[]>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Un contatore invece di un orario: serve solo a rimontare il timer da capo
  // a ogni serie, e non richiede di leggere l'orologio durante il render.
  const [restId, setRestId] = useState(0);
  const tempId = useRef(-1);

  const [optimisticSets, applyOptimistic] = useOptimistic(
    sets,
    (state: LoggedSet[], action: OptimisticAction) =>
      action.type === "add"
        ? [...state, action.set]
        : state.filter((set) => set.id !== action.id),
  );

  const byExercise = groupByExercise(optimisticSets);
  const volume = totalVolume(optimisticSets);

  function handleLog(exerciseId: number, weight: number, reps: number) {
    setError(null);
    // Il recupero parte subito: aspettare il server vorrebbe dire perdere secondi veri.
    setRestId((value) => value + 1);

    startTransition(async () => {
      const already = byExercise.get(exerciseId)?.length ?? 0;
      applyOptimistic({
        type: "add",
        set: { id: tempId.current--, exerciseId, setNumber: already + 1, weight, reps },
      });

      const result = await logSet({ sessionId: session.id, exerciseId, weight, reps });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(setId: number) {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: setId });
      const result = await deleteSet(setId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleEnd() {
    setError(null);
    startTransition(async () => {
      const result = await endSession(session.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <main>
      <header className="flex items-start justify-between gap-3 pt-12 pb-5">
        <div className="min-w-0 flex-1">
          <SessionTimer startedAt={session.startedAt.toISOString()} />
          <p className="mt-1 truncate text-[13px] text-muted">
            {label} — {focus}
            {volume > 0 ? ` · ${formatVolume(volume)} kg sollevati` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleEnd}
          className="min-h-11 shrink-0 rounded-full bg-accent px-5 text-[15px] font-semibold text-white active:opacity-80"
        >
          Fine
        </button>
      </header>

      {exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          sets={byExercise.get(exercise.id) ?? []}
          lastTime={lastTime[exercise.id] ?? []}
          onLog={(weight, reps) => handleLog(exercise.id, weight, reps)}
          onDelete={handleDelete}
          disabled={false}
        />
      ))}

      {error ? (
        <p role="alert" className="mb-4 px-1 text-[13px] text-over">
          {error}
        </p>
      ) : null}

      {restId > 0 ? <RestTimer key={restId} onClose={() => setRestId(0)} /> : null}
    </main>
  );
}
