CREATE TABLE "workout_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_id" integer NOT NULL,
	"day" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"set_number" integer NOT NULL,
	"weight" real NOT NULL,
	"reps" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_day_id_workout_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."workout_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_workout_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_sessions_day_idx" ON "workout_sessions" USING btree ("day");--> statement-breakpoint
CREATE INDEX "workout_sets_session_idx" ON "workout_sets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "workout_sets_exercise_idx" ON "workout_sets" USING btree ("exercise_id");