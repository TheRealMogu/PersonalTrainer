CREATE TABLE "fitbit_connessione" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"scade_il" timestamp with time zone NOT NULL,
	"connesso_il" timestamp with time zone DEFAULT now() NOT NULL
);
