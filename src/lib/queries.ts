import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import type { DailyTotals } from "@/lib/history";
import {
  meals,
  quickFoods,
  supplementChecks,
  supplements,
  targets,
  waterDays,
  workoutDays,
  workoutExercises,
  workoutSessions,
  workoutSets,
  type Meal,
  type QuickFood,
  type Supplement,
  type WorkoutExercise,
  type WorkoutSession,
} from "@/db/schema";
import {
  integratoriDelGiorno,
  type IntegratoreDelGiorno,
} from "@/lib/integratori";
import { OBIETTIVI_PREDEFINITI, type Obiettivi } from "@/lib/targets";
import type { LoggedSet } from "@/lib/workout";

export async function getMealsByDay(day: string): Promise<Meal[]> {
  return db
    .select()
    .from(meals)
    .where(eq(meals.day, day))
    .orderBy(asc(meals.createdAt), asc(meals.id));
}

/** Totali per giornata in un intervallo di date, solo per i giorni con pasti. */
export async function getDailyTotals(
  from: string,
  to: string
): Promise<DailyTotals[]> {
  const rows = await db
    .select({
      day: meals.day,
      kcal: sql<number>`sum(${meals.kcal})::int`,
      carbs: sql<number>`sum(${meals.carbs})::float8`,
      protein: sql<number>`sum(${meals.protein})::float8`,
      fat: sql<number>`sum(${meals.fat})::float8`,
      // Le calorie registrate senza macro, per poterlo dichiarare invece di
      // far passare i macro del giorno per completi.
      kcalNonScomposte: sql<number>`coalesce(sum(${meals.kcal}) filter (where ${meals.onlyKcal}), 0)::int`,
    })
    .from(meals)
    .where(and(gte(meals.day, from), lte(meals.day, to)))
    .groupBy(meals.day)
    .orderBy(asc(meals.day));

  // Il driver puo' restituire i numeric come stringa: normalizziamo qui.
  return rows.map((row) => ({
    day: row.day,
    kcal: Number(row.kcal),
    carbs: Number(row.carbs),
    protein: Number(row.protein),
    fat: Number(row.fat),
    kcalNonScomposte: Number(row.kcalNonScomposte),
  }));
}

/**
 * Gli obiettivi attivi: quelli scritti in *Piano -> Obiettivi*, oppure quelli
 * di partenza se non ne sono stati ancora scritti.
 *
 * Non si lancia mai un errore da qui. Se la riga non c'e' l'app deve aprirsi
 * lo stesso con i numeri predefiniti: una schermata che aspetta di sapere i
 * target per mostrare qualcosa e' una schermata che non si apre.
 */
export async function getObiettivi(): Promise<Obiettivi> {
  const [riga] = await db.select().from(targets).where(eq(targets.id, 1));
  if (!riga) return OBIETTIVI_PREDEFINITI;

  return {
    macro: {
      kcal: riga.kcal,
      carbs: riga.carbs,
      protein: riga.protein,
      fat: riga.fat,
    },
    bicchieriAcqua: riga.waterGlasses,
  };
}

/** I bicchieri d'acqua di una giornata. Nessuna riga vuol dire nessun bicchiere. */
export async function getWater(day: string): Promise<number> {
  const [riga] = await db
    .select()
    .from(waterDays)
    .where(eq(waterDays.day, day));
  return riga?.glasses ?? 0;
}

/**
 * Gli integratori di una giornata, gia' con la spunta applicata.
 *
 * Solo quelli attivi: uno messo da parte non deve ricomparire nel diario di
 * ieri. Le spunte dei giorni in cui lo prendevi restano nel database, ma la
 * riga del diario e' la domanda "cosa devo prendere *oggi*".
 */
export async function getIntegratoriDelGiorno(
  day: string
): Promise<IntegratoreDelGiorno[]> {
  const [attivi, spunte] = await Promise.all([
    db
      .select({
        id: supplements.id,
        name: supplements.name,
        dose: supplements.dose,
      })
      .from(supplements)
      .where(eq(supplements.active, true))
      .orderBy(asc(supplements.sortOrder), asc(supplements.id)),
    db
      .select({ id: supplementChecks.supplementId })
      .from(supplementChecks)
      .where(eq(supplementChecks.day, day)),
  ]);

  return integratoriDelGiorno(
    attivi,
    spunte.map((riga) => riga.id)
  );
}

/** Tutti gli integratori, attivi e messi da parte, per la schermata di gestione. */
export async function getIntegratori(): Promise<Supplement[]> {
  return db
    .select()
    .from(supplements)
    .orderBy(asc(supplements.sortOrder), asc(supplements.id));
}

export async function getQuickFoods(): Promise<QuickFood[]> {
  return db
    .select()
    .from(quickFoods)
    .orderBy(asc(quickFoods.sortOrder), asc(quickFoods.id));
}

export type WorkoutDayWithExercises = {
  id: number;
  label: string;
  focus: string;
  exercises: WorkoutExercise[];
};

export async function getWorkout(): Promise<WorkoutDayWithExercises[]> {
  const [days, exercises] = await Promise.all([
    db
      .select()
      .from(workoutDays)
      .orderBy(asc(workoutDays.sortOrder), asc(workoutDays.id)),
    db
      .select()
      .from(workoutExercises)
      .orderBy(asc(workoutExercises.sortOrder), asc(workoutExercises.id)),
  ]);

  return days.map((day) => ({
    id: day.id,
    label: day.label,
    focus: day.focus,
    exercises: exercises.filter((exercise) => exercise.dayId === day.id),
  }));
}

/** La seduta ancora aperta, se c'e': riaprendo l'app si riprende da li'. */
export async function getOpenSession(): Promise<WorkoutSession | null> {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(isNull(workoutSessions.endedAt))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);
  return session ?? null;
}

export async function getSession(id: number): Promise<WorkoutSession | null> {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.id, id));
  return session ?? null;
}

export async function getSessionSets(sessionId: number): Promise<LoggedSet[]> {
  return db
    .select({
      id: workoutSets.id,
      exerciseId: workoutSets.exerciseId,
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .where(eq(workoutSets.sessionId, sessionId))
    .orderBy(asc(workoutSets.setNumber), asc(workoutSets.id));
}

/**
 * Le serie dell'ultima volta che hai fatto questi esercizi, una lista per
 * esercizio. Serve a proporre il carico senza doverlo ricordare.
 */
export async function getPreviousSets(
  exerciseIds: number[],
  excludeSessionId: number
): Promise<Map<number, LoggedSet[]>> {
  const result = new Map<number, LoggedSet[]>();
  if (exerciseIds.length === 0) return result;

  // Per ogni esercizio interessa solo la seduta piu' recente in cui compare.
  const rows = await db
    .select({
      id: workoutSets.id,
      exerciseId: workoutSets.exerciseId,
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      sessionId: workoutSets.sessionId,
      startedAt: workoutSessions.startedAt,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .where(
      and(
        inArray(workoutSets.exerciseId, exerciseIds),
        ne(workoutSets.sessionId, excludeSessionId)
      )
    )
    .orderBy(desc(workoutSessions.startedAt), asc(workoutSets.setNumber));

  const seenSession = new Map<number, number>();
  for (const row of rows) {
    const chosen = seenSession.get(row.exerciseId);
    if (chosen === undefined) seenSession.set(row.exerciseId, row.sessionId);
    else if (chosen !== row.sessionId) continue;

    const list = result.get(row.exerciseId);
    const set = {
      id: row.id,
      exerciseId: row.exerciseId,
      setNumber: row.setNumber,
      weight: row.weight,
      reps: row.reps,
    };
    if (list) list.push(set);
    else result.set(row.exerciseId, [set]);
  }
  return result;
}

export type SedutaDettaglio = {
  id: number;
  day: string;
  label: string;
  focus: string;
  startedAt: Date;
  endedAt: Date | null;
  esercizi: {
    id: number;
    name: string;
    sets: number;
    reps: string;
    serie: LoggedSet[];
    /** Le serie della volta prima, per il confronto riga per riga. */
    precedenti: LoggedSet[];
  }[];
};

/**
 * Una seduta passata, per intero: esercizi, serie, carichi e confronto con la
 * volta prima.
 *
 * Mancava del tutto. La lista degli ultimi allenamenti mostrava il volume e
 * un cestino: si poteva cancellare una seduta ma non aprirla, quindi i dati
 * entravano e non uscivano piu'. Gli esercizi restano nell'ordine del
 * programma, anche quelli saltati: sapere cosa NON hai fatto e' parte del
 * sapere com'e' andata.
 */
export async function getSessionDetail(
  id: number
): Promise<SedutaDettaglio | null> {
  const [riga] = await db
    .select({
      id: workoutSessions.id,
      dayId: workoutSessions.dayId,
      day: workoutSessions.day,
      label: workoutDays.label,
      focus: workoutDays.focus,
      startedAt: workoutSessions.startedAt,
      endedAt: workoutSessions.endedAt,
    })
    .from(workoutSessions)
    .innerJoin(workoutDays, eq(workoutSessions.dayId, workoutDays.id))
    .where(eq(workoutSessions.id, id));

  if (!riga) return null;

  const esercizi = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.dayId, riga.dayId))
    .orderBy(asc(workoutExercises.sortOrder), asc(workoutExercises.id));

  const [serie, precedenti] = await Promise.all([
    getSessionSets(id),
    getPreviousSets(
      esercizi.map((e) => e.id),
      id
    ),
  ]);

  const perEsercizio = new Map<number, LoggedSet[]>();
  for (const s of serie) {
    const lista = perEsercizio.get(s.exerciseId);
    if (lista) lista.push(s);
    else perEsercizio.set(s.exerciseId, [s]);
  }

  return {
    id: riga.id,
    day: riga.day,
    label: riga.label,
    focus: riga.focus,
    startedAt: riga.startedAt,
    endedAt: riga.endedAt,
    esercizi: esercizi.map((e) => ({
      id: e.id,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      serie: perEsercizio.get(e.id) ?? [],
      precedenti: precedenti.get(e.id) ?? [],
    })),
  };
}

/** Sedute concluse, dalla piu' recente, col volume gia' sommato. */
export async function getRecentSessions(limit = 20) {
  return db
    .select({
      id: workoutSessions.id,
      dayId: workoutSessions.dayId,
      day: workoutSessions.day,
      label: workoutDays.label,
      focus: workoutDays.focus,
      startedAt: workoutSessions.startedAt,
      endedAt: workoutSessions.endedAt,
      volume: sql<number>`coalesce(sum(${workoutSets.weight} * ${workoutSets.reps}), 0)::float8`,
      setCount: sql<number>`count(${workoutSets.id})::int`,
    })
    .from(workoutSessions)
    .innerJoin(workoutDays, eq(workoutSessions.dayId, workoutDays.id))
    .leftJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
    .where(isNotNull(workoutSessions.endedAt))
    .groupBy(workoutSessions.id, workoutDays.label, workoutDays.focus)
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit);
}

/**
 * Le sedute concluse in un intervallo di date, con volume e numero di serie.
 *
 * Simile a `getRecentSessions`, ma tagliata sulle date invece che sul
 * numero: il riepilogo della settimana deve prendere quella settimana, non
 * "le ultime venti" -- che in una settimana da quattro sedute ne
 * porterebbe dentro tre di quelle prima.
 */
export async function getSessionsInRange(from: string, to: string) {
  return db
    .select({
      day: workoutSessions.day,
      label: workoutDays.label,
      focus: workoutDays.focus,
      volume: sql<number>`coalesce(sum(${workoutSets.weight} * ${workoutSets.reps}), 0)::float8`,
      setCount: sql<number>`count(${workoutSets.id})::int`,
    })
    .from(workoutSessions)
    .innerJoin(workoutDays, eq(workoutSessions.dayId, workoutDays.id))
    .leftJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
    .where(
      and(
        isNotNull(workoutSessions.endedAt),
        gte(workoutSessions.day, from),
        lte(workoutSessions.day, to)
      )
    )
    .groupBy(workoutSessions.id, workoutDays.label, workoutDays.focus)
    .orderBy(asc(workoutSessions.day));
}

export type ExerciseProgressPoint = {
  day: string;
  bestOneRepMax: number;
  volume: number;
  topWeight: number;
  topReps: number;
};

export type ExerciseProgress = {
  exerciseId: number;
  name: string;
  points: ExerciseProgressPoint[];
};

/**
 * Andamento per esercizio: una riga per seduta, col massimale stimato piu'
 * alto e il volume totale. Serve a rispondere a "la panca sta salendo?", che
 * guardando le singole serie non si capisce.
 */
export async function getExerciseProgress(
  limitPerExercise = 12
): Promise<ExerciseProgress[]> {
  const rows = await db
    .select({
      exerciseId: workoutSets.exerciseId,
      name: workoutExercises.name,
      day: workoutSessions.day,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(
      workoutExercises,
      eq(workoutSets.exerciseId, workoutExercises.id)
    )
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .orderBy(asc(workoutSessions.day), asc(workoutSets.setNumber));

  // Raggruppa per esercizio e per giornata, tenendo la serie migliore.
  const byExercise = new Map<
    number,
    { name: string; days: Map<string, ExerciseProgressPoint> }
  >();

  for (const row of rows) {
    const oneRm =
      row.weight > 0 && row.reps > 0 ? row.weight * (1 + row.reps / 30) : 0;
    let entry = byExercise.get(row.exerciseId);
    if (!entry) {
      entry = { name: row.name, days: new Map() };
      byExercise.set(row.exerciseId, entry);
    }

    const point = entry.days.get(row.day);
    if (!point) {
      entry.days.set(row.day, {
        day: row.day,
        bestOneRepMax: oneRm,
        volume: row.weight * row.reps,
        topWeight: row.weight,
        topReps: row.reps,
      });
    } else {
      point.volume += row.weight * row.reps;
      if (oneRm > point.bestOneRepMax) {
        point.bestOneRepMax = oneRm;
        point.topWeight = row.weight;
        point.topReps = row.reps;
      }
    }
  }

  return (
    [...byExercise.entries()]
      .map(([exerciseId, entry]) => ({
        exerciseId,
        name: entry.name,
        points: [...entry.days.values()].slice(-limitPerExercise),
      }))
      // Solo esercizi con almeno due sedute: con un punto solo non c'e' andamento.
      .filter((item) => item.points.length >= 2)
      .sort((a, b) => a.name.localeCompare(b.name, "it"))
  );
}

/**
 * Tutto quello che hai registrato, per l'esportazione.
 *
 * Senza limite di righe di proposito: l'export serve proprio a portarsi via
 * tutto. Per un diario personale sono qualche migliaio di righe, non milioni.
 */
export async function getAllMealsForExport() {
  return db
    .select()
    .from(meals)
    .orderBy(asc(meals.day), asc(meals.createdAt), asc(meals.id));
}

export async function getAllSetsForExport() {
  return db
    .select({
      sessionId: workoutSets.sessionId,
      day: workoutSessions.day,
      dayLabel: workoutDays.label,
      focus: workoutDays.focus,
      exercise: workoutExercises.name,
      setNumber: workoutSets.setNumber,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      createdAt: workoutSets.createdAt,
    })
    .from(workoutSets)
    .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
    .innerJoin(workoutDays, eq(workoutSessions.dayId, workoutDays.id))
    .innerJoin(
      workoutExercises,
      eq(workoutSets.exerciseId, workoutExercises.id)
    )
    .orderBy(
      asc(workoutSessions.day),
      asc(workoutSets.createdAt),
      asc(workoutSets.id)
    );
}
