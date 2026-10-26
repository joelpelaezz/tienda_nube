ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_visible" boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"movement_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"stock_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
);

DO $$ BEGIN
	ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk"
		FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "stock_movements_variant_id_idx" ON "stock_movements" USING btree ("variant_id");
CREATE INDEX IF NOT EXISTS "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");
