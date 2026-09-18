ALTER TABLE "meals" ADD COLUMN "client_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "meals_client_id_key" ON "meals" USING btree ("client_id");