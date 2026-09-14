import { DayNav } from "@/components/day-nav";
import { DbErrorPanel } from "@/components/db-error-panel";
import { Diary } from "@/components/diary";
import { isIsoDate, todayIso } from "@/lib/date";
import { slotForHour } from "@/lib/meal-slots";
import { getMealsByDay, getQuickFoods } from "@/lib/queries";
import type { Meal, QuickFood } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day: requested } = await searchParams;
  const day = requested && isIsoDate(requested) ? requested : todayIso();

  let meals: Meal[];
  let quickFoods: QuickFood[];
  try {
    [meals, quickFoods] = await Promise.all([getMealsByDay(day), getQuickFoods()]);
  } catch (error) {
    // Si registra comunque nei log del server: nascondere l'errore all'utente
    // non vuol dire nasconderlo a chi deve ripararlo.
    console.error("[diario] lettura dei dati fallita:", error);
    return (
      <main>
        <DayNav day={day} />
        <DbErrorPanel error={error} />
      </main>
    );
  }

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
