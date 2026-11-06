CREATE TABLE "product_stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"movement_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"stock_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
ALTER TABLE "product_variant_options" DROP CONSTRAINT "product_variant_options_product_variant_id_fk";
--> statement-breakpoint
ALTER TABLE "product_variant_options" DROP CONSTRAINT "product_variant_options_variant_option_id_fk";
--> statement-breakpoint
DROP INDEX "product_variant_options_variant_position_unique";--> statement-breakpoint
ALTER TABLE "product_variant_options" ALTER COLUMN "position" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "shipping_methods" ALTER COLUMN "base_cost" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "shipping_methods" ALTER COLUMN "is_active" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "shipping_methods" ALTER COLUMN "position" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "shipping_rules" ALTER COLUMN "cost" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "shipping_rules" ALTER COLUMN "is_active" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "shipping_rules" ALTER COLUMN "position" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "stock_reserved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "reserved_stock" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_stock_movements" ADD CONSTRAINT "product_stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_movements" ADD CONSTRAINT "product_stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_stock_movements_product_id_idx" ON "product_stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_stock_movements_created_at_idx" ON "product_stock_movements" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_variant_option_id_variant_options_id_fk" FOREIGN KEY ("variant_option_id") REFERENCES "public"."variant_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_variant_position_unique" UNIQUE("product_variant_id","position");

-- Preserve stock reservation state for pending orders created before this migration.
UPDATE "order_items" AS oi
SET "stock_reserved" = true
FROM "orders" AS o, "products" AS p
WHERE oi."order_id" = o."id"
  AND oi."product_id" = p."id"
  AND oi."variant_id" IS NOT NULL
  AND o."status" = 'pending'
  AND coalesce(p."product_type", 'physical') <> 'digital';
