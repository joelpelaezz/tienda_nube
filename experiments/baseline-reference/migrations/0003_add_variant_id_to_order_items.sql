-- Add variant_id to order_items for tracking which variant was purchased
ALTER TABLE "order_items" ADD COLUMN "variant_id" integer;

-- Foreign key to product_variants (allows NULL for legacy orders without variants)
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk"
  FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

-- Index for fast lookups by variant
CREATE INDEX "order_items_variant_id_idx" ON "order_items" USING btree ("variant_id");

-- Add reserved_stock for pending order reservation
ALTER TABLE "product_variants" ADD COLUMN "reserved_stock" integer DEFAULT 0 NOT NULL;

-- Index for efficient pending order expiration query
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status", "created_at")
  WHERE "status" = 'pending';
