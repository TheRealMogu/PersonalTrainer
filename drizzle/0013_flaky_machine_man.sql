CREATE TABLE "steps_days" (
	"day" date PRIMARY KEY NOT NULL,
	"steps" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "steps_target" integer DEFAULT 10000 NOT NULL;