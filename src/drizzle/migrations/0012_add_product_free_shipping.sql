-- C4-TRACE: persist product-level free shipping independently from promotional badges.
ALTER TABLE "products"
ADD COLUMN "has_free_shipping" boolean NOT NULL DEFAULT false;
