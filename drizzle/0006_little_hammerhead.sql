CREATE TABLE "supplement_checks" (
	"day" date NOT NULL,
	"supplement_id" integer NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplement_checks_day_supplement_id_pk" PRIMARY KEY("day","supplement_id")
);
--> statement-breakpoint
CREATE TABLE "supplements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"dose" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplement_checks" ADD CONSTRAINT "supplement_checks_supplement_id_supplements_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id") ON DELETE cascade ON UPDATE no action;