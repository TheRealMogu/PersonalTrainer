import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { quickFoods, workoutDays, workoutExercises } from "../src/db/schema";
import { QUICK_FOODS_SEED, WORKOUT_SEED } from "../src/lib/seed-data";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL non impostata: copia .env.example in .env.local");
  }

  const db = drizzle(neon(connectionString));

  console.log("Svuoto le tabelle di riferimento…");
  await db.delete(workoutExercises);
  await db.delete(workoutDays);
  await db.delete(quickFoods);

  console.log(`Inserisco ${QUICK_FOODS_SEED.length} tasti rapidi…`);
  await db.insert(quickFoods).values(
    QUICK_FOODS_SEED.map((food, index) => ({ ...food, sortOrder: index })),
  );

  console.log(`Inserisco ${WORKOUT_SEED.length} giornate di allenamento…`);
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
