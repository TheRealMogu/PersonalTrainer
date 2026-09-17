CREATE TABLE "water_days" (
	"day" date PRIMARY KEY NOT NULL,
	"glasses" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
