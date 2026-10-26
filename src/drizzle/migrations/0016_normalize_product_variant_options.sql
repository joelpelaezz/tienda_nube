CREATE TABLE IF NOT EXISTS "product_variant_options" (
  "product_variant_id" integer NOT NULL,
  "variant_option_id" integer NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  CONSTRAINT "product_variant_options_product_variant_id_variant_option_id_pk"
    PRIMARY KEY("product_variant_id", "variant_option_id"),
  CONSTRAINT "product_variant_options_product_variant_id_fk"
    FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE,
  CONSTRAINT "product_variant_options_variant_option_id_fk"
    FOREIGN KEY ("variant_option_id") REFERENCES "variant_options"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "product_variant_options_option_idx"
  ON "product_variant_options" ("variant_option_id");

CREATE UNIQUE INDEX IF NOT EXISTS "product_variant_options_variant_position_unique"
  ON "product_variant_options" ("product_variant_id", "position");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "product_variants" pv
    CROSS JOIN LATERAL unnest(coalesce(pv."option_ids", ARRAY[]::text[])) AS raw_option(option_id)
    LEFT JOIN "variant_options" vo ON vo."id" = CASE
      WHEN trim(raw_option.option_id) ~ '^[0-9]+$' THEN trim(raw_option.option_id)::integer
      ELSE NULL
    END
    WHERE trim(raw_option.option_id) !~ '^[0-9]+$' OR vo."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot normalize product_variant_options: invalid option_ids detected';
  END IF;
END $$;

INSERT INTO "product_variant_options" ("product_variant_id", "variant_option_id", "position")
SELECT pv."id", raw_option.option_id::integer, raw_option.position - 1
FROM "product_variants" pv
CROSS JOIN LATERAL unnest(coalesce(pv."option_ids", ARRAY[]::text[])) WITH ORDINALITY AS raw_option(option_id, position)
ON CONFLICT ("product_variant_id", "variant_option_id") DO UPDATE
SET "position" = EXCLUDED."position";

ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "option_ids";
