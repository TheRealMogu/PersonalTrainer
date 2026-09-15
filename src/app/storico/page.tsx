import Link from "next/link";
import { Card } from "@/components/card";
import { DbErrorPanel } from "@/components/db-error-panel";
import { ExerciseProgressChart } from "@/components/exercise-progress-chart";
import { MacroHistoryChart, MacroHistoryTable } from "@/components/macro-history-chart";
import { MacroStatTile } from "@/components/macro-stat-tile";
import { PageHeader } from "@/components/page-header";
import { RangeFilter } from "@/components/range-filter";
import { Section } from "@/components/section";
import { todayIso } from "@/lib/date";
import { buildDateRange, buildHistoryStats, fillMissingDays } from "@/lib/history";
import { getDailyTotals, getExerciseProgress } from "@/lib/queries";
import { MACRO_LABELS, MACRO_ORDER } from "@/lib/targets";

export const dynamic = "force-dynamic";

const ALLOWED_RANGES = [7, 30];
const DEFAULT_RANGE = 7;

function parseRange(value: string | undefined): number {
  const parsed = Number(value);
  return ALLOWED_RANGES.includes(parsed) ? parsed : DEFAULT_RANGE;
}

export default async function StoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ giorni?: string }>;
}) {
  const { giorni } = await searchParams;
  const range = parseRange(giorni);

  const today = todayIso();
  const dates = buildDateRange(today, range);
  let rows: Awaited<ReturnType<typeof getDailyTotals>>;
  let exerciseProgress: Awaited<ReturnType<typeof getExerciseProgress>>;
  try {
    [rows, exerciseProgress] = await Promise.all([
      getDailyTotals(dates[0], today),
      getExerciseProgress(),
    ]);
  } catch (error) {
    console.error("[storico] lettura dei dati fallita:", error);
    return (
      <main>
        <PageHeader title="Storico" subtitle={`Ultimi ${range} giorni`} />
        <DbErrorPanel error={error} />
      </main>
    );
  }

  const days = fillMissingDays(rows, dates);
  const stats = buildHistoryStats(days, today);

  return (
    <main>
      <PageHeader title="Storico" subtitle={`Ultimi ${range} giorni`} />

      <RangeFilter active={range} />

      {stats.loggedDays === 0 && !stats.todayLogged ? (
        <Card>
          <div className="py-2 text-center">
            <p className="text-[15px] font-medium">Ancora niente da mostrare</p>
            <p className="mt-1 text-[13px] leading-snug text-muted">
              Lo storico si riempie da solo man mano che registri i pasti. Bastano
              due giorni perché le medie comincino a dire qualcosa.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-hairline px-5 text-[15px] font-medium text-accent tocco active:bg-raised"
            >
              Vai al diario
            </Link>
          </div>
        </Card>
      ) : null}

      {stats.loggedDays === 0 && stats.todayLogged ? (
        <Card>
          <p className="text-[15px] text-muted">
            Per ora c&apos;è solo oggi, che non è ancora finito: le medie
            compaiono da domani. Qui sotto intanto vedi la giornata.
          </p>
        </Card>
      ) : null}

      {stats.loggedDays > 0 ? (
        <>
          <Section title="Media giornaliera">
            <Card>
              <div className="grid grid-cols-2 gap-2">
                {MACRO_ORDER.map((macro) => (
                  <MacroStatTile key={macro} macro={macro} average={stats.averages[macro]} />
                ))}
              </div>
              <p className="mt-3 text-[13px] text-muted">
                {stats.loggedDays === 1
                  ? `Un solo giorno registrato sui ${stats.totalDays} conclusi`
                  : `Media su ${stats.loggedDays} giorni registrati sui ${stats.totalDays} conclusi`}
                ; lo scarto è rispetto al target giornaliero. I giorni non
                compilati non abbassano la media, e oggi non entra nel conto
                finché non è finito.
              </p>
            </Card>
          </Section>

          <Section title="Giorni entro il target">
            <Card>
              <dl className="divide-y divide-hairline">
                {MACRO_ORDER.map((macro) => (
                  <div
                    key={macro}
                    className="flex items-baseline justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <dt className="text-[15px]">{MACRO_LABELS[macro]}</dt>
                    <dd className="text-[15px] font-semibold tabular-nums">
                      {stats.daysWithinTarget[macro]}
                      <span className="font-normal text-muted"> / {stats.loggedDays}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Section>
        </>
      ) : null}

      {/* Con niente registrato il grafico sarebbe una griglia vuota: non si mostra. */}
      {stats.loggedDays > 0 || stats.todayLogged ? (
        <Section title="Andamento">
          <Card>
            <div className="flex flex-col gap-8">
              {MACRO_ORDER.map((macro) => (
                <MacroHistoryChart key={macro} macro={macro} days={days} today={today} />
              ))}
            </div>
            <p className="mt-4 text-[13px] text-muted">
              Le colonne oltre la linea del target sono in rosso. L&apos;ultima
              colonna è oggi, ancora in corso.
            </p>
          </Card>

          {/* Stessa sezione: la tabella è lo stesso dato del grafico, letto come numeri. */}
          <Card>
            <MacroHistoryTable days={days} />
          </Card>
        </Section>
      ) : null}

      {exerciseProgress.length > 0 ? (
        <Section title="Progressione in palestra">
          <Card>
            <div className="flex flex-col gap-8">
              {exerciseProgress.map((progress) => (
                <ExerciseProgressChart key={progress.exerciseId} progress={progress} />
              ))}
            </div>
            <p className="mt-4 text-[13px] text-muted">
              Il massimale stimato mette sulla stessa scala serie diverse: 80 kg × 5
              e 70 kg × 10 valgono quasi uguale. È una stima, non una misura.
            </p>
          </Card>
        </Section>
      ) : null}
    </main>
  );
}
