UPDATE "product_variants" pv
SET "variant_type_id" = vo."variant_type_id"
FROM "variant_options" vo
WHERE pv."variant_type_id" IS NULL
  AND pv."option_ids" IS NOT NULL
  AND array_length(pv."option_ids", 1) > 0
  AND vo."id" = (pv."option_ids"[1])::integer;
