CREATE TYPE "public"."meal_slot" AS ENUM('colazione', 'pranzo', 'cena', 'spuntino');--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "slot" "meal_slot" DEFAULT 'spuntino' NOT NULL;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "quantity" real DEFAULT 1 NOT NULL;