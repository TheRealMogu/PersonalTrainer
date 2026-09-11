import { Card } from "@/components/card";
import { DayNav } from "@/components/day-nav";
import { MacroBar } from "@/components/macro-bar";
import { ManualMealForm } from "@/components/manual-meal-form";
import { MealList } from "@/components/meal-list";
import { QuickFoods } from "@/components/quick-foods";
import { isIsoDate, todayIso } from "@/lib/date";
import { buildProgress, sumMacros } from "@/lib/nutrition";
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
  const progress = buildProgress(sumMacros(meals));

  return (
    <main>
      <DayNav day={day} />

      <Card title="Riepilogo">
        <div className="divide-y divide-hairline">
          {progress.map((item) => (
            <MacroBar key={item.key} progress={item} />
          ))}
        </div>
      </Card>

      <Card title="Tasti rapidi">
        <QuickFoods day={day} foods={quickFoods} />
      </Card>

      <Card title="Altro">
        <ManualMealForm day={day} />
      </Card>

      <Card title={`Pasti (${meals.length})`}>
        <MealList day={day} meals={meals} />
      </Card>
    </main>
  );
}
