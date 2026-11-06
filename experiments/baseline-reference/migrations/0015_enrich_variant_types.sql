ALTER TABLE "variant_types"
  ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS "presentation" text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "variant_options"
  ADD COLUMN IF NOT EXISTS "color_hex" text,
  ADD COLUMN IF NOT EXISTS "image_url" text,
  ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

-- Recommended editable defaults. Existing names are preserved.
INSERT INTO "variant_types" ("name", "kind", "presentation", "is_active", "position")
SELECT defaults.name, 'system', defaults.presentation, true, defaults.position
FROM (VALUES
  ('Color', 'color', 0),
  ('Talle', 'text', 1),
  ('Tamaño', 'text', 2),
  ('Material', 'text', 3)
) AS defaults(name, presentation, position)
WHERE NOT EXISTS (
  SELECT 1 FROM "variant_types" existing
  WHERE lower(trim(existing."name")) = lower(trim(defaults.name))
);
