CREATE TABLE "login_tentativi" (
	"ip" text PRIMARY KEY NOT NULL,
	"tentativi" integer NOT NULL,
	"ultimo_tentativo" timestamp with time zone NOT NULL,
	"bloccato_fino" timestamp with time zone
);
