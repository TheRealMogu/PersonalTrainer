CREATE TABLE "workout_exercise_weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"exercise_id" integer NOT NULL,
	"settimana" integer NOT NULL,
	"reps" text NOT NULL,
	"peso" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_programma" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"settimana_corrente" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_exercise_weeks" ADD CONSTRAINT "workout_exercise_weeks_exercise_id_workout_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workout_exercise_weeks_uniq" ON "workout_exercise_weeks" USING btree ("exercise_id","settimana");