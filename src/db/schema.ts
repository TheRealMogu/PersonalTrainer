import {
  date,
  pgEnum,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** I momenti della giornata, nell'ordine in cui si mangia. */
export const mealSlotEnum = pgEnum("meal_slot", [
  "colazione",
  "pranzo",
  "cena",
  "spuntino",
]);

/**
 * Pasti registrati nel diario, uno per riga, raggruppati per giornata.
 * `day` è una DATE pura (YYYY-MM-DD): niente fusi orari da gestire.
 */
export const meals = pgTable(
  "meals",
  {
    id: serial("id").primaryKey(),
    day: date("day").notNull(),
    slot: mealSlotEnum("slot").notNull().default("spuntino"),
    name: text("name").notNull(),
    /** Quante porzioni: 1 = quella base, 0.5 = mezza, 2 = doppia. */
    quantity: real("quantity").notNull().default(1),
    kcal: integer("kcal").notNull(),
    carbs: real("carbs").notNull(),
    protein: real("protein").notNull(),
    fat: real("fat").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("meals_day_idx").on(table.day)],
);

/** Cibi ricorrenti mostrati come tasti rapidi nel diario. */
export const quickFoods = pgTable("quick_foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  portion: text("portion"),
  kcal: integer("kcal").notNull(),
  carbs: real("carbs").notNull(),
  protein: real("protein").notNull(),
  fat: real("fat").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * L'acqua bevuta, un conteggio per giornata.
 *
 * Una riga per giorno e non una per bicchiere: un bicchiere non ha niente da
 * raccontare -- non ha un nome, un orario che serva, dei macro. Conta solo
 * quanti ne hai bevuti, e "togliere l'ultimo" e' sottrarre uno, non
 * ripescare una riga. Cosi' la correzione e' lo stesso gesto
 * dell'inserimento al contrario, senza bisogno di annullamenti.
 */
export const waterDays = pgTable("water_days", {
  /** Chiave primaria: di acqua ce n'e' una quantita' sola al giorno. */
  day: date("day").primaryKey(),
  glasses: integer("glasses").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Giornate del programma di allenamento (es. "Day 1 — Push"). */
export const workoutDays = pgTable("workout_days", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  focus: text("focus").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Esercizi di una giornata, con serie e ripetizioni. */
export const workoutExercises = pgTable(
  "workout_exercises",
  {
    id: serial("id").primaryKey(),
    dayId: integer("day_id")
      .notNull()
      .references(() => workoutDays.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sets: integer("sets").notNull(),
    reps: text("reps").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("workout_exercises_day_idx").on(table.dayId)],
);

/**
 * Una seduta di allenamento: si apre quando inizi, si chiude quando premi
 * Fine. `endedAt` nullo significa "in corso", cosi' riaprendo l'app la ritrovi
 * dove l'avevi lasciata.
 */
export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: serial("id").primaryKey(),
    dayId: integer("day_id")
      .notNull()
      .references(() => workoutDays.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [index("workout_sessions_day_idx").on(table.day)],
);

/** Una serie eseguita: il carico e le ripetizioni che hai davvero fatto. */
export const workoutSets = pgTable(
  "workout_sets",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => workoutExercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    weight: real("weight").notNull(),
    reps: integer("reps").notNull(),
    /**
     * Identificativo generato dal telefono prima di inviare la serie.
     *
     * Serve per riprovare senza duplicare: se la rete cade dopo che il
     * database ha scritto ma prima che la risposta torni indietro, il
     * secondo tentativo trova lo stesso identificativo e non fa niente.
     * Nullo sulle serie registrate prima che esistesse.
     */
    clientId: text("client_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workout_sets_session_idx").on(table.sessionId),
    index("workout_sets_exercise_idx").on(table.exerciseId),
    // Unico fra i non nulli: Postgres tratta ogni NULL come diverso dagli
    // altri, quindi le serie vecchie non danno fastidio.
    uniqueIndex("workout_sets_client_id_key").on(table.clientId),
  ],
);

export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type QuickFood = typeof quickFoods.$inferSelect;
export type WaterDay = typeof waterDays.$inferSelect;
export type WorkoutDay = typeof workoutDays.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
