ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "price_offer" integer;

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_price_offer_less_than_price"
  CHECK (price_offer IS NULL OR price IS NULL OR price_offer < price);
