CREATE TABLE "targets" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"kcal" integer NOT NULL,
	"carbs" real NOT NULL,
	"protein" real NOT NULL,
	"fat" real NOT NULL,
	"water_glasses" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
