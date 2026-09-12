import "./load-env";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { quickFoods, workoutDays, workoutExercises, workoutSets } from "../src/db/schema";
import { QUICK_FOODS_SEED, WORKOUT_SEED } from "../src/lib/seed-data";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL non impostata: copia .env.example in .env.local");
  }

  const db = drizzle(neon(connectionString));

  // I tasti rapidi non sono riferiti da nessuno: si possono sempre rifare.
  console.log(`Ricarico ${QUICK_FOODS_SEED.length} tasti rapidi…`);
  await db.delete(quickFoods);
  await db.insert(quickFoods).values(
    QUICK_FOODS_SEED.map((food, index) => ({ ...food, sortOrder: index })),
  );

  /*
   * Le serie registrate puntano agli esercizi con ON DELETE CASCADE: rifare
   * il programma cancellerebbe tutto lo storico dei carichi. Meglio fermarsi
   * e dirlo che perdere mesi di allenamenti in silenzio.
   */
  const [{ count: loggedSets }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workoutSets);

  const forza = process.argv.includes("--forza-allenamento");

  if (loggedSets > 0 && !forza) {
    console.log(
      `\nTrovate ${loggedSets} serie gia' registrate: lascio il programma com'e'.`,
    );
    console.log(
      "Rifarlo cancellerebbe lo storico dei carichi. Per forzare comunque:",
    );
    console.log("  npm run db:seed -- --forza-allenamento\n");
    console.log("Seed completato (solo tasti rapidi).");
    return;
  }

  if (loggedSets > 0) {
    console.log(`Forzato: cancello ${loggedSets} serie registrate.`);
  }

  console.log(`Inserisco ${WORKOUT_SEED.length} giornate di allenamento…`);
  await db.delete(workoutExercises);
  await db.delete(workoutDays);
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
