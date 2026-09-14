import { Card } from "@/components/card";
import { DbErrorPanel } from "@/components/db-error-panel";
import { PageHeader } from "@/components/page-header";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { WorkoutSession } from "@/components/workout-session";
import {
  getOpenSession,
  getPreviousSets,
  getRecentSessions,
  getSessionSets,
  getWorkout,
} from "@/lib/queries";
import { formatVolume } from "@/lib/workout";
import type { LoggedSet } from "@/lib/workout";

export const dynamic = "force-dynamic";

/**
 * Tutte le letture in un posto solo, cosi' il try/catch avvolge i dati e non
 * il render: un errore di disegno non deve travestirsi da problema di
 * database.
 */
async function caricaDati() {
  const [days, open] = await Promise.all([getWorkout(), getOpenSession()]);

  // Allenamento in corso: la pagina diventa la schermata di esecuzione.
  const dayInCorso = open ? days.find((item) => item.id === open.dayId) : undefined;

  if (open && dayInCorso) {
    const [sets, previous] = await Promise.all([
      getSessionSets(open.id),
      getPreviousSets(
        dayInCorso.exercises.map((exercise) => exercise.id),
        open.id,
      ),
    ]);

    const lastTime: Record<number, LoggedSet[]> = {};
    for (const [exerciseId, list] of previous) lastTime[exerciseId] = list;

    return { stato: "in-corso", session: open, day: dayInCorso, sets, lastTime } as const;
  }

  return { stato: "elenco", days, recent: await getRecentSessions(5) } as const;
}

export default async function AllenamentoPage() {
  let dati: Awaited<ReturnType<typeof caricaDati>>;
  try {
    dati = await caricaDati();
  } catch (error) {
    console.error("[allenamento] lettura dei dati fallita:", error);
    return (
      <main>
        <PageHeader title="Allenamento" subtitle="Team Schiavi · settimana T1" />
        <DbErrorPanel error={error} />
      </main>
    );
  }

  if (dati.stato === "in-corso") {
    return (
      <WorkoutSession
        session={dati.session}
        label={dati.day.label}
        focus={dati.day.focus}
        exercises={dati.day.exercises}
        sets={dati.sets}
        lastTime={dati.lastTime}
      />
    );
  }

  const { days, recent } = dati;

  return (
    <main>
      <PageHeader title="Allenamento" subtitle="Team Schiavi · settimana T1" />

      {days.length === 0 ? (
        <Card>
          <p className="text-[15px] text-muted">
            Nessun programma caricato: lancia <code>npm run db:seed</code>.
          </p>
        </Card>
      ) : (
        days.map((day) => (
          <Card key={day.id} title={`${day.label} — ${day.focus}`}>
            <ul className="mb-4 divide-y divide-hairline">
              {day.exercises.map((exercise) => (
                <li
                  key={exercise.id}
                  className="flex items-baseline gap-3 py-2.5 first:pt-0"
                >
                  <span className="flex-1 text-[15px] leading-snug">{exercise.name}</span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-muted">
                    {exercise.sets}×{exercise.reps}
                  </span>
                </li>
              ))}
            </ul>
            <StartWorkoutButton dayId={day.id} label={`${day.label} — ${day.focus}`} />
          </Card>
        ))
      )}

      {recent.length > 0 ? (
        <Card title="Ultimi allenamenti">
          <ul className="divide-y divide-hairline">
            {recent.map((session) => (
              <li
                key={session.id}
                className="flex items-baseline justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">
                    {session.label} — {session.focus}
                  </p>
                  <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                    {session.day.slice(8, 10)}/{session.day.slice(5, 7)} · {session.setCount} serie
                  </p>
                </div>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                  {formatVolume(session.volume)} kg
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </main>
  );
}
