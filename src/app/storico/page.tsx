import { Card } from "@/components/card";
import { MacroHistoryChart, MacroHistoryTable } from "@/components/macro-history-chart";
import { MacroStatTile } from "@/components/macro-stat-tile";
import { PageHeader } from "@/components/page-header";
import { RangeFilter } from "@/components/range-filter";
import { todayIso } from "@/lib/date";
import { buildDateRange, buildHistoryStats, fillMissingDays } from "@/lib/history";
import { getDailyTotals } from "@/lib/queries";
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
  const rows = await getDailyTotals(dates[0], today);
  const days = fillMissingDays(rows, dates);
  const stats = buildHistoryStats(days);

  return (
    <main>
      <PageHeader title="Storico" subtitle={`Ultimi ${range} giorni`} />

      <RangeFilter active={range} />

      {stats.loggedDays === 0 ? (
        <Card>
          <p className="text-[15px] text-muted">
            Nessun pasto registrato in questo periodo. Aggiungine dal diario e
            qui vedrai l&apos;andamento.
          </p>
        </Card>
      ) : (
        <>
          <Card title="Media giornaliera">
            <div className="grid grid-cols-2 gap-2">
              {MACRO_ORDER.map((macro) => (
                <MacroStatTile key={macro} macro={macro} average={stats.averages[macro]} />
              ))}
            </div>
            <p className="mt-3 text-[13px] text-muted">
              Media sui {stats.loggedDays} giorni registrati su {stats.totalDays}; lo
              scarto è rispetto al target giornaliero. I giorni non compilati non
              abbassano la media.
            </p>
          </Card>

          <Card title="Andamento">
            <div className="space-y-8">
              {MACRO_ORDER.map((macro) => (
                <MacroHistoryChart key={macro} macro={macro} days={days} />
              ))}
            </div>
            <p className="mt-4 text-[13px] text-muted">
              Le colonne oltre la linea del target sono in rosso.
            </p>
          </Card>

          <Card title="Giorni entro il target">
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

          <Card title="I numeri">
            <MacroHistoryTable days={days} />
          </Card>
        </>
      )}
    </main>
  );
}
