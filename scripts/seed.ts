import "./load-env";
import { existsSync } from "node:fs";
import path from "node:path";
import { isNull, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  quickFoods,
  workoutDays,
  workoutExercises,
  workoutSets,
} from "../src/db/schema";

/*
 * Il collegamento arriva da `src/db`, lo stesso che usa l'app, invece di
 * costruirne uno qui con il driver di Neon scritto a mano. Cosi' il seed
 * funziona anche contro un Postgres normale -- in locale e sulla macchina
 * della CI, dove Neon non si deve nemmeno provare a raggiungerla.
 */

async function main() {
  /*
   * `seed-data.ts` conteneva i tuoi cibi veri e il nome della tua scheda --
   * dati personali in un file pubblico. Ora e' `seed-data.local.ts`, che non
   * e' tracciato da git (vedi `.gitignore`): se non lo trova sul disco, come
   * capita su una clonazione nuova o in CI, usa `seed-data.example.ts`, che
   * e' quello pubblico. Un `existsSync` esplicito e non un
   * import-provato-e-preso: un errore vero dentro il file locale (una
   * virgola sbagliata) deve fermare lo script, non passare inosservato come
   * "file assente". L'import resta dentro `main`: il file e' CommonJS (niente
   * `"type": "module"` in `package.json`), e un `await` fuori da una
   * funzione non ci compila.
   */
  const usaLocale = existsSync(
    path.resolve(import.meta.dirname, "../src/lib/seed-data.local.ts"),
  );
  if (!usaLocale) {
    console.log(
      "Nessun src/lib/seed-data.local.ts: uso i dati d'esempio (src/lib/seed-data.example.ts).",
    );
  }
  /*
   * Il percorso passa da una variabile e non da una stringa letterale
   * apposta: con la stringa letterale `tsc` prova a risolvere il modulo
   * anche quando non serve (il ramo "locale" quando gira in CI, dove
   * seed-data.local.ts non esiste per davvero) e la build fallisce con
   * "Cannot find module". Il tipo delle due forme è lo stesso, quindi il
   * cast su quella d'esempio -- che invece è sempre presente -- resta
   * preciso.
   */
  const percorso = usaLocale
    ? "../src/lib/seed-data.local"
    : "../src/lib/seed-data.example";
  const { QUICK_FOODS_SEED, WORKOUT_SEED } = (await import(
    percorso
  )) as typeof import("../src/lib/seed-data.example");

  // I tasti rapidi non sono riferiti da nessuno: si possono sempre rifare.
  console.log(`Ricarico ${QUICK_FOODS_SEED.length} tasti rapidi…`);
  await db.delete(quickFoods);
  await db
    .insert(quickFoods)
    .values(
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
