import { AllenamentoSintesi } from "@/components/allenamento-sintesi";
import { Card } from "@/components/card";
import { DbErrorPanel } from "@/components/db-error-panel";
import { IconAllenamento } from "@/components/nav-icons";
import { PageHeader } from "@/components/page-header";
import { RecentSessions } from "@/components/recent-sessions";
import { Section } from "@/components/section";
import { SettimanaProgramma } from "@/components/settimana-programma";
import { UndoSeduta } from "@/components/undo-seduta";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { WorkoutSession } from "@/components/workout-session";
import {
  getOpenSession,
  getPreviousSets,
  getRecentSessions,
  getSessionSets,
  getSessionsInRange,
  getSettimaneDisponibili,
  getSettimanaCorrente,
  getWorkout,
} from "@/lib/queries";
import { lunediDellaSettimana, shiftIsoDate, todayIso } from "@/lib/date";
import { repsDaMostrare, suggestNextDayId } from "@/lib/workout";
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
  const dayInCorso = open
    ? days.find((item) => item.id === open.dayId)
    : undefined;

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

    return {
      stato: "in-corso",
      session: open,
      day: dayInCorso,
      sets,
      lastTime,
    } as const;
  }

  const oggi = todayIso();
  const lunedi = lunediDellaSettimana(oggi);
  const [recent, settimana, settimaneBlocco, settimanaBlocco] =
    await Promise.all([
      getRecentSessions(5),
      getSessionsInRange(lunedi, shiftIsoDate(lunedi, 6)),
      getSettimaneDisponibili(),
      getSettimanaCorrente(),
    ]);

  // La rotazione si legge dallo storico: l'ultima seduta conclusa decide
  // quale giornata proporre adesso.
  const suggestedId = suggestNextDayId(
    days.map((day) => day.id),
    recent[0]?.dayId ?? null,
  );

  return {
    stato: "elenco",
    days,
    recent,
    suggestedId,
    oggi,
    lunedi,
    giorniAllenati: settimana.map((seduta) => seduta.day),
    settimaneBlocco,
    settimanaBlocco,
  } as const;
}

export default async function AllenamentoPage() {
  let dati: Awaited<ReturnType<typeof caricaDati>>;
  try {
    dati = await caricaDati();
  } catch (error) {
    console.error("[allenamento] lettura dei dati fallita:", error);
    return (
      <main>
        <PageHeader
          title="Allenamento"
          subtitle="Le tue giornate"
          icon={<IconAllenamento />}
        />
        <DbErrorPanel error={error} />
      </main>
    );
  }

  if (dati.stato === "in-corso") {
    return (
      <>
        <UndoSeduta />
        <WorkoutSession
          session={dati.session}
          label={dati.day.label}
          focus={dati.day.focus}
          exercises={dati.day.exercises}
          sets={dati.sets}
          lastTime={dati.lastTime}
        />
      </>
    );
  }

  const {
    days,
    recent,
    suggestedId,
    oggi,
    lunedi,
    giorniAllenati,
    settimaneBlocco,
    settimanaBlocco,
  } = dati;
  const suggested = days.find((day) => day.id === suggestedId);
  const ultima = recent[0];

  return (
    <main>
      <PageHeader
        title="Allenamento"
        subtitle="Le tue giornate"
        icon={<IconAllenamento />}
      />

      {/*
        Quale giornata tocca: e' la domanda con cui si entra in palestra, e
        prima stava solo nella memoria di chi si allena. Resta un
        suggerimento: le giornate qui sotto sono tutte avviabili.
      */}
      {suggested ? (
        <section className="mb-4 rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
            Tocca a te
          </p>
          <h2 className="mt-1.5 text-[22px] font-semibold leading-tight">
            {suggested.label} — {suggested.focus}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {suggested.exercises.length} esercizi
          </p>
          <div className="mt-4">
            <StartWorkoutButton
              dayId={suggested.id}
              label={`${suggested.label} — ${suggested.focus}`}
            />
          </div>
        </section>
      ) : null}

      {/* L'ultima seduta sta qui e non piu' nella riga sotto "Tocca a te": detta due volte era rumore. */}
      <AllenamentoSintesi
        lunedi={lunedi}
        oggi={oggi}
        giorniAllenati={giorniAllenati}
        ultima={ultima}
      />

      {days.length === 0 ? (
        <Card>
          <p className="text-[15px] text-muted">
            Nessun programma caricato: lancia <code>npm run db:seed</code>.
          </p>
        </Card>
      ) : (
        <Section title="Il programma">
          <SettimanaProgramma
            settimane={settimaneBlocco}
            corrente={settimanaBlocco}
          />
          {days.map((day) => (
            <Card key={day.id}>
              <header className="mb-3 flex items-baseline justify-between gap-2">
                <h3 className="text-[15px] font-semibold">
                  {day.label} — {day.focus}
                </h3>
                {day.id === suggestedId ? (
                  <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-muted">
                    consigliata
                  </span>
                ) : null}
              </header>
              <ul className="mb-4 divide-y divide-hairline">
                {day.exercises.map((exercise) => (
                  <li
                    key={exercise.id}
                    className="flex items-baseline gap-3 py-2.5 first:pt-0"
                  >
                    <span className="flex-1 text-[15px] leading-snug">
                      {exercise.name}
                    </span>
                    <span className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-muted">
                      {exercise.sets}×{repsDaMostrare(exercise)}
                    </span>
                  </li>
                ))}
              </ul>
              <StartWorkoutButton
                dayId={day.id}
                label={`${day.label} — ${day.focus}`}
                variante="secondaria"
              />
            </Card>
          ))}
        </Section>
      )}

      {recent.length > 0 ? (
        <Section title="Ultimi allenamenti">
          <Card>
            <RecentSessions sessions={recent} />
          </Card>
        </Section>
      ) : null}
      <UndoSeduta />
    </main>
  );
}
