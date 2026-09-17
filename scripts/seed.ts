import "./load-env";
import { isNull, sql } from "drizzle-orm";
import { db } from "../src/db";
import { quickFoods, workoutDays, workoutExercises, workoutSets } from "../src/db/schema";
import { QUICK_FOODS_SEED, WORKOUT_SEED } from "../src/lib/seed-data";

/*
 * Il collegamento arriva da `src/db`, lo stesso che usa l'app, invece di
 * costruirne uno qui con il driver di Neon scritto a mano. Cosi' il seed
 * funziona anche contro un Postgres normale -- in locale e sulla macchina
 * della CI, dove Neon non si deve nemmeno provare a raggiungerla.
 */
async function main() {

  // I tasti rapidi non sono riferiti da nessuno: si possono sempre rifare.
  console.log(`Ricarico ${QUICK_FOODS_SEED.length} tasti rapidi…`);
  await db.delete(quickFoods);
  await db.insert(quickFoods).values(
    QUICK_FOODS_SEED.map((food, index) => ({ ...food, sortOrder: index })),
  );

  /*
   * Le serie registrate puntano agli esercizi con ON DELETE CASCADE, quindi
   * una volta rifare il programma voleva dire cancellare lo storico dei
   * carichi, e questo script poteva solo fermarsi e dirlo.
   *
   * Adesso c'e' `archiviato_il`: quello che esce dal programma si archivia
   * invece di sparire, e le serie restano attaccate dove sono. Il seed non
   * cancella piu' niente -- si limita a mettere da parte il vecchio.
   *
   * Per cambiare scheda sul serio c'e' *Piano -> Cambia la scheda*, che fa
   * vedere cosa cambia prima di toccare qualcosa. Questo script resta per
   * partire da zero.
   */
  const [{ count: loggedSets }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workoutSets);

  if (loggedSets > 0) {
    console.log(
      `\nTrovate ${loggedSets} serie gia' registrate: restano tutte dove sono.`,
    );
    console.log(
      "Il programma di prima viene archiviato, non cancellato: lo storico si legge ancora.",
    );
    console.log(
      "Per un cambio scheda vero, con il confronto prima: Piano -> Cambia la scheda.\n",
    );
  }

  console.log(`Inserisco ${WORKOUT_SEED.length} giornate di allenamento…`);
  const adesso = new Date();
  await db
    .update(workoutExercises)
    .set({ archiviatoIl: adesso })
    .where(isNull(workoutExercises.archiviatoIl));
  await db
    .update(workoutDays)
    .set({ archiviatoIl: adesso })
    .where(isNull(workoutDays.archiviatoIl));
  for (const [dayIndex, day] of WORKOUT_SEED.entries()) {
    const [inserted] = await db
      .insert(workoutDays)
      .values({ label: day.label, focus: day.focus, sortOrder: dayIndex })
      .returning({ id: workoutDays.id });

    await db.insert(workoutExercises).values(
      day.exercises.map((exercise, exerciseIndex) => ({
        dayId: inserted.id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        sortOrder: exerciseIndex,
      })),
    );
  }

  console.log("Seed completato.");
}

main().catch((error) => {
  console.error("Seed fallito:", error);
  process.exit(1);
});
