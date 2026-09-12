import {
  date,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Pasti registrati nel diario, uno per riga, raggruppati per giornata.
 * `day` è una DATE pura (YYYY-MM-DD): niente fusi orari da gestire.
 */
export const meals = pgTable(
  "meals",
  {
    id: serial("id").primaryKey(),
    day: date("day").notNull(),
    name: text("name").notNull(),
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

export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type QuickFood = typeof quickFoods.$inferSelect;
export type WorkoutDay = typeof workoutDays.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
