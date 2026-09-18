import {
  boolean,
  date,
  pgEnum,
  index,
  integer,
  pgTable,
  primaryKey,
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
    /**
     * Le calorie ci sono, i macro no: registrato "a occhio" mangiando fuori.
     *
     * I tre macro restano a zero perche' la colonna non puo' essere vuota, ma
     * **zero qui non vuol dire zero grammi**: vuol dire "non lo so". La
     * differenza e' tutta la regola 5 -- un giorno non registrato non e'
     * zero -- e senza questa colonna sarebbe indistinguibile, perche' un
     * pasto con kcal e tre zeri e' esattamente quello che scriverebbe
     * qualcuno convinto di aver mangiato solo alcol.
     *
     * Chi legge i totali deve dirlo invece di far finta: le barre dei macro
     * dichiarano quante calorie restano fuori dal conto.
     */
    onlyKcal: boolean("only_kcal").notNull().default(false),
    /**
     * Generato dal telefono prima di provare a salvare.
     *
     * E' quello che rende sicuro riprovare: se la rete cade dopo che il
     * server ha scritto ma prima che la risposta torni indietro, il secondo
     * tentativo arriva con lo stesso id e non scrive un doppione. E' la
     * stessa cosa che fa gia' `workout_sets.clientId` per le serie in
     * palestra; il diario non ce l'aveva, e un salvataggio fallito voleva
     * dire un pasto perso.
     *
     * Nullo sulle righe scritte prima che questa colonna esistesse: Postgres
     * tratta ogni NULL come diverso dagli altri, quindi l'indice unico non si
     * lamenta.
     */
    clientId: text("client_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("meals_day_idx").on(table.day),
    uniqueIndex("meals_client_id_key").on(table.clientId),
  ]
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
 * I numeri che il personal trainer puo' cambiare: target dei macro e
 * bicchieri d'acqua al giorno.
 *
 * Una riga sola, con `id` sempre a 1. Stavano in `src/lib/targets.ts`, cioe'
 * nel codice: cambiarli voleva dire un deploy, e il PT li cambia a ogni fase.
 * Una cosa che nella vita cambia deve essere una riga di database.
 *
 * I valori del codice restano come punto di partenza: se la riga non c'e'
 * ancora, l'app usa quelli e funziona lo stesso. Nessuna schermata deve
 * aspettare che qualcuno apra le impostazioni.
 */
export const targets = pgTable("targets", {
  id: integer("id").primaryKey().default(1),
  kcal: integer("kcal").notNull(),
  carbs: real("carbs").notNull(),
  protein: real("protein").notNull(),
  fat: real("fat").notNull(),
  /** Bicchieri d'acqua al giorno. La dimensione del bicchiere resta fissa. */
  waterGlasses: integer("water_glasses").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Giornate del programma di allenamento (es. "Day 1 — Push"). */
export const workoutDays = pgTable("workout_days", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  focus: text("focus").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  /**
   * Come per gli esercizi: nullo = e' nel programma di adesso.
   *
   * Serve anche qui perche' `workout_sessions` punta alle giornate, e una
   * giornata cancellata si porterebbe via le sedute che ci hai fatto sopra.
   */
  archiviatoIl: timestamp("archiviato_il", { withTimezone: true }),
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
    /**
     * Quando e' uscito dal programma. Nullo = lo fai adesso.
     *
     * E' la colonna che rende sicuro cambiare scheda. `workout_sets` punta
     * qui con `ON DELETE CASCADE`: cancellare un esercizio si porta via tutte
     * le serie registrate su di lui, cioe' mesi di carichi. Per questo il
     * seed si rifiuta di partire quando trova serie in archivio.
     *
     * Con questa colonna un esercizio non si cancella mai: esce dal programma
     * e resta leggibile. I carichi di marzo si leggono anche se a settembre
     * quell'esercizio non lo fai piu'.
     *
     * Chi legge cambia di conseguenza: la scheda e la seduta mostrano solo i
     * non archiviati (e' quello che fai adesso), lo storico e il dettaglio di
     * una seduta passata li mostrano tutti (raccontano quello che e'
     * successo).
     */
    archiviatoIl: timestamp("archiviato_il", { withTimezone: true }),
  },
  (table) => [index("workout_exercises_day_idx").on(table.dayId)]
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
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    /**
     * Com'e' andata, a parole.
     *
     * "Spalla che tira" vale piu' di tre decimali sul carico: fra un mese e'
     * l'unica cosa che spiega perche' quel giorno la panca e' scesa. I numeri
     * dicono cosa hai fatto, questa riga dice perche'.
     *
     * Nulla finche' non scrivi niente: una nota vuota e una nota mai scritta
     * sono la stessa cosa, e un campo vuoto a schermo su ogni seduta sarebbe
     * un compito in piu' tutte le volte.
     */
    note: text("note"),
  },
  (table) => [index("workout_sessions_day_idx").on(table.day)]
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("workout_sets_session_idx").on(table.sessionId),
    index("workout_sets_exercise_idx").on(table.exerciseId),
    // Unico fra i non nulli: Postgres tratta ogni NULL come diverso dagli
    // altri, quindi le serie vecchie non danno fastidio.
    uniqueIndex("workout_sets_client_id_key").on(table.clientId),
  ]
);

/**
 * Gli integratori che prendi: nome, dose come testo, e se li prendi ancora.
 *
 * Non sono cibo e non stanno nei pasti. Non hanno macro, non entrano nel
 * budget calorico, e la domanda a cui rispondono e' un'altra: **"l'ho presa
 * oggi?"**, non "quanto mi resta". Per questo seguono la forma dell'acqua e
 * non quella del cibo -- un elenco e una spunta al giorno.
 *
 * La dose e' testo libero di proposito: "1 compressa", "2000 UI", "una
 * misurina". Un campo numerico con un'unita' da scegliere costerebbe piu' di
 * quanto vale, e quello che costa piu' di quanto vale non lo si segna.
 */
export const supplements = pgTable("supplements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dose: text("dose"),
  /**
   * `false` vuol dire "non lo prendo piu'": sparisce dal diario ma le spunte
   * dei giorni passati restano. Il cestino fa questo, non una DELETE: le
   * righe registrate non si riscrivono, e "l'ho preso a marzo?" deve avere
   * ancora una risposta a settembre.
   */
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Le spunte, una per integratore per giorno.
 *
 * La riga esiste solo se l'hai preso: niente colonna "preso true/false". Un
 * giorno senza riga e' un giorno senza risposta, non un "no" -- e' la stessa
 * regola per cui un giorno senza pasti non e' un giorno a zero calorie.
 */
export const supplementChecks = pgTable(
  "supplement_checks",
  {
    day: date("day").notNull(),
    supplementId: integer("supplement_id")
      .notNull()
      .references(() => supplements.id, { onDelete: "cascade" }),
    takenAt: timestamp("taken_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.day, table.supplementId] })]
);

export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type QuickFood = typeof quickFoods.$inferSelect;
export type WaterDay = typeof waterDays.$inferSelect;
export type Supplement = typeof supplements.$inferSelect;
export type SupplementCheck = typeof supplementChecks.$inferSelect;
export type Targets = typeof targets.$inferSelect;
export type WorkoutDay = typeof workoutDays.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
