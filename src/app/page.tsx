import { DayNav } from "@/components/day-nav";
import { Diary } from "@/components/diary";
import { isIsoDate, todayIso } from "@/lib/date";
import { getMealsByDay, getQuickFoods } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day: requested } = await searchParams;
  const day = requested && isIsoDate(requested) ? requested : todayIso();

  const [meals, quickFoods] = await Promise.all([getMealsByDay(day), getQuickFoods()]);

  return (
    <main>
      <DayNav day={day} />
      {/* `key` sul giorno: cambiando data lo stato ottimistico riparte pulito */}
      <Diary key={day} day={day} meals={meals} quickFoods={quickFoods} />
    </main>
  );
}
