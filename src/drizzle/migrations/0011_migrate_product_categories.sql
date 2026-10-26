-- C4-TRACE: migrate all product-category assignments to the canonical junction table.
INSERT INTO "product_categories" ("product_id", "category_id")
SELECT "id", "category_id"
FROM "products"
WHERE "category_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "product_categories" pc
    WHERE pc."product_id" = "products"."id"
      AND pc."category_id" = "products"."category_id"
  );

INSERT INTO "product_categories" ("product_id", "category_id")
SELECT cp."product_id", cp."category_id"
FROM "category_products" cp
WHERE NOT EXISTS (
  SELECT 1
  FROM "product_categories" pc
  WHERE pc."product_id" = cp."product_id"
    AND pc."category_id" = cp."category_id"
);

DROP TABLE "category_products";
ALTER TABLE "products" DROP COLUMN "category_id";
