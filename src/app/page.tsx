import { DayNav } from "@/components/day-nav";
import { Diary } from "@/components/diary";
import { isIsoDate, todayIso } from "@/lib/date";
import { slotForHour } from "@/lib/meal-slots";
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

  // Il momento proposto segue l'ora italiana: alle otto si registra colazione.
  const hourInRome = Number(
    new Intl.DateTimeFormat("it-IT", { hour: "numeric", hour12: false, timeZone: "Europe/Rome" })
      .format(new Date()),
  );

  return (
    <main>
      <DayNav day={day} />
      {/* `key` sul giorno: cambiando data lo stato ottimistico riparte pulito */}
      <Diary
        key={day}
        day={day}
        meals={meals}
        quickFoods={quickFoods}
        defaultSlot={slotForHour(hourInRome)}
      />
    </main>
  );
}
