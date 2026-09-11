import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { getWorkout } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AllenamentoPage() {
  const days = await getWorkout();

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
            <ul className="divide-y divide-hairline">
              {day.exercises.map((exercise) => (
                <li
                  key={exercise.id}
                  className="flex items-baseline gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex-1 text-[15px] leading-snug">{exercise.name}</span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-muted">
                    {exercise.sets}×{exercise.reps}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </main>
  );
}
