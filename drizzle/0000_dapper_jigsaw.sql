CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"name" text NOT NULL,
	"kcal" integer NOT NULL,
	"carbs" real NOT NULL,
	"protein" real NOT NULL,
	"fat" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quick_foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"portion" text,
	"kcal" integer NOT NULL,
	"carbs" real NOT NULL,
	"protein" real NOT NULL,
	"fat" real NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"focus" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_id" integer NOT NULL,
	"name" text NOT NULL,
	"sets" integer NOT NULL,
	"reps" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_day_id_workout_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."workout_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meals_day_idx" ON "meals" USING btree ("day");--> statement-breakpoint
CREATE INDEX "workout_exercises_day_idx" ON "workout_exercises" USING btree ("day_id");