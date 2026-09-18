CREATE TABLE "weight_days" (
	"day" date PRIMARY KEY NOT NULL,
	"weight_kg" real NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
