"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSet, endSession, logSet } from "@/app/allenamento/actions";
import type { WorkoutExercise, WorkoutSession as Session } from "@/db/schema";
import { newClientId, pendingForSession, type PendingSet } from "@/lib/pending-sets";
import {
  dequeue,
  enqueue,
  flush,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/pending-store";
import { formatVolume, groupByExercise, totalVolume, type LoggedSet } from "@/lib/workout";
import { AnimatedNumber } from "./animated-number";
import { ExerciseCard } from "./exercise-card";
import { RestTimer } from "./rest-timer";
import { SessionTimer } from "./session-timer";

type OptimisticAction = { type: "add"; set: LoggedSet } | { type: "remove"; id: number };

/**
 * Le serie ancora in coda hanno id negativi, come quelle ottimistiche. Senza
 * separare i due intervalli si scontravano su -1: React segnalava due chiavi
 * uguali e il cestino rischiava di togliere quella sbagliata.
 */
const BASE_ID_CODA = -100_000;

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

  // Le serie rimaste sul telefono perche' la rete non c'era.
  const coda = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const inAttesa = pendingForSession(coda, session.id);

  /*
   * Le serie in attesa si disegnano insieme alle altre, con un id negativo:
   * a meta' allenamento devi vedere quante ne hai fatte, non quante ne ha
   * ricevute il server. L'id negativo e' anche il modo di riconoscerle quando
   * si tocca il cestino.
   */
  const contatore = new Map<number, number>();
  for (const set of optimisticSets) {
    contatore.set(set.exerciseId, (contatore.get(set.exerciseId) ?? 0) + 1);
  }

  const tutteLeSerie: LoggedSet[] = [
    ...optimisticSets,
    ...inAttesa.map((p, index) => {
      // Il numero della serie lo assegna il server, ma finche' non arriva
      // serve comunque: senza, in palestra non sai a che serie sei.
      const numero = (contatore.get(p.exerciseId) ?? 0) + 1;
      contatore.set(p.exerciseId, numero);
      return {
        id: BASE_ID_CODA - index,
        exerciseId: p.exerciseId,
        setNumber: numero,
        weight: p.weight,
        reps: p.reps,
        inAttesa: true,
      };
    }),
  ];

  const byExercise = groupByExercise(tutteLeSerie);
  const volume = totalVolume(tutteLeSerie);

  const inviaInCoda = useCallback(
    (item: PendingSet) =>
      logSet({
        sessionId: item.sessionId,
        exerciseId: item.exerciseId,
        weight: item.weight,
        reps: item.reps,
        clientId: item.clientId,
      }).catch(() => {
        // Senza rete la Server Action non parte nemmeno e lancia. Qui non e'
        // un errore dell'app: e' il caso normale in palestra, e deve
        // restare un "riprova piu' tardi", non finire nella schermata di
        // errore.
        return { ok: false, error: "rete" } as const;
      }),
    [],
  );

  const svuota = useCallback(async () => {
    try {
      const inviate = await flush(inviaInCoda);
      if (inviate > 0) router.refresh();
    } catch {
      // Lo svuotamento non deve mai far cadere la pagina: le serie restano
      // in coda e si riprova al prossimo giro.
    }
  }, [inviaInCoda, router]);

  // Si riprova quando la rete torna, e una volta all'apertura: se hai chiuso
  // l'app in palestra, le serie partono da sole appena riapri con il segnale.
  useEffect(() => {
    void svuota();
    window.addEventListener("online", svuota);
    return () => window.removeEventListener("online", svuota);
  }, [svuota]);

  function handleLog(exerciseId: number, weight: number, reps: number) {
    setError(null);
    // Il recupero parte subito: aspettare il server vorrebbe dire perdere secondi veri.
    setRestId((value) => value + 1);

    const clientId = newClientId();

    startTransition(async () => {
      const already = byExercise.get(exerciseId)?.length ?? 0;
      applyOptimistic({
        type: "add",
        set: { id: tempId.current--, exerciseId, setNumber: already + 1, weight, reps },
      });

      const result = await logSet({ sessionId: session.id, exerciseId, weight, reps, clientId })
        // Rete assente: l'azione non arriva nemmeno a partire.
        .catch(() => ({ ok: false, error: "rete" }) as const);

      if (!result.ok) {
        // La serie non si perde: resta sul telefono e riparte da sola.
        enqueue({
          clientId,
          sessionId: session.id,
          exerciseId,
          weight,
          reps,
          savedAt: Date.now(),
        });
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(setId: number) {
    setError(null);

    // Nell'intervallo della coda: la serie e' ancora sul telefono.
    if (setId <= BASE_ID_CODA) {
      const item = inAttesa[BASE_ID_CODA - setId];
      if (item) dequeue(item.clientId);
      return;
    }

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
          <p className="mt-1 text-[13px] leading-snug text-muted">
            {label} — {focus}
            {volume > 0 ? (
              <>
                {" · "}
                <AnimatedNumber value={volume} format={formatVolume} /> kg sollevati
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={handleEnd}
          className="min-h-11 shrink-0 rounded-full bg-accent px-5 text-[15px] font-semibold text-on-accent active:opacity-80"
        >
          Fine
        </button>
      </header>

      {inAttesa.length > 0 ? (
        <section className="mb-4 rounded-2xl border border-hairline bg-raised p-4">
          <p className="text-[15px] font-medium">
            {inAttesa.length === 1
              ? "1 serie da mandare"
              : `${inAttesa.length} serie da mandare`}
          </p>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            Sono salvate sul telefono e partono da sole quando torna la rete.
            Continua pure ad allenarti.
          </p>
          <button
            type="button"
            onClick={() => void svuota()}
            className="mt-3 min-h-11 w-full rounded-xl border border-hairline bg-surface text-[15px] font-medium text-accent active:opacity-70"
          >
            Prova adesso
          </button>
        </section>
      ) : null}

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
