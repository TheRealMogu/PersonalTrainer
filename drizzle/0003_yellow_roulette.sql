ALTER TABLE "workout_sets" ADD COLUMN "client_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sets_client_id_key" ON "workout_sets" USING btree ("client_id");