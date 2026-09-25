import { DayNav } from "@/components/day-nav";
import { DbErrorPanel } from "@/components/db-error-panel";
import { Diary } from "@/components/diary";
import { WeekStrip } from "@/components/week-strip";
import { isIsoDate, shiftIsoDate, todayIso } from "@/lib/date";
import {
  buildDateRange,
  fillMissingDays,
  type DailyTotals,
} from "@/lib/history";
import { slotForHour } from "@/lib/meal-slots";
import {
  getDailyTotals,
  getFitbitConnesso,
  getIntegratoriDelGiorno,
  getMealsByDay,
  getObiettivi,
  getPassi,
  getPeso,
  getQuickFoods,
  getUltimaVolta,
  getUsiPerMomento,
  getWater,
} from "@/lib/queries";
import type { UltimaVolta, UsoPerMomento } from "@/lib/abitudini";
import type { IntegratoreDelGiorno } from "@/lib/integratori";
import type { Obiettivi } from "@/lib/targets";
import type { Meal, QuickFood } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day: requested } = await searchParams;
  const today = todayIso();
  const day = requested && isIsoDate(requested) ? requested : today;

  // La striscia in cima mostra sempre gli ultimi sette giorni fino a oggi,
  // anche quando stai guardando un giorno passato: serve a orientarsi, non a
  // seguire la navigazione.
  const settimana = buildDateRange(today, 7);

  // Il momento proposto segue l'ora italiana: alle otto si registra
  // colazione. Si calcola qui e non piu' giu' perche' adesso decide anche
  // *cosa* leggere -- l'ordine dei tasti e quale pasto proporre di ricopiare.
  const hourInRome = Number(
    new Intl.DateTimeFormat("it-IT", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Rome",
    }).format(new Date())
  );
  const momento = slotForHour(hourInRome);

  let meals: Meal[];
  let quickFoods: QuickFood[];
  let totaliSettimana: DailyTotals[];
  let acqua: number;
  let peso: number | null;
  let passi: number | null;
  let fitbitConnesso: boolean;
  let obiettivi: Obiettivi;
  let integratori: IntegratoreDelGiorno[];
  let usi: UsoPerMomento[];
  let ultimaVolta: UltimaVolta | null;
  try {
    [
      meals,
      quickFoods,
      totaliSettimana,
      acqua,
      peso,
      passi,
      fitbitConnesso,
      obiettivi,
      integratori,
      usi,
      ultimaVolta,
    ] = await Promise.all([
      getMealsByDay(day),
      getQuickFoods(),
      getDailyTotals(settimana[0], today),
      getWater(day),
      getPeso(day),
      getPassi(day),
      getFitbitConnesso(),
      getObiettivi(),
      getIntegratoriDelGiorno(day),
      getUsiPerMomento(today),
      getUltimaVolta(momento, day),
    ]);
  } catch (error) {
    // Si registra comunque nei log del server: nascondere l'errore all'utente
    // non vuol dire nasconderlo a chi deve ripararlo.
    console.error("[diario] lettura dei dati fallita:", error);
    return (
      <main>
        <DayNav day={day} pasti={0} />
        <DbErrorPanel error={error} />
      </main>
    );
  }

  return (
    <main>
      <DayNav day={day} pasti={meals.length} />
      <WeekStrip
        days={fillMissingDays(totaliSettimana, settimana)}
        current={day}
        today={today}
        targets={obiettivi.macro}
      />
      {/* `key` sul giorno: cambiando data lo stato ottimistico riparte pulito */}
      <Diary
        key={day}
        day={day}
        meals={meals}
        quickFoods={quickFoods}
        defaultSlot={momento}
        acqua={acqua}
        peso={peso}
        passi={passi}
        fitbitConnesso={fitbitConnesso}
        obiettivi={obiettivi}
        integratori={integratori}
        usi={usi}
        ultimaVolta={ultimaVolta}
        ieri={shiftIsoDate(day, -1)}
      />
    </main>
  );
}
