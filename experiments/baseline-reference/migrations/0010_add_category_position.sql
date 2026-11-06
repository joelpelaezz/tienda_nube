ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "position" integer NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY parent_id ORDER BY id) - 1 AS position
  FROM categories
)
UPDATE categories
SET position = ordered.position
FROM ordered
WHERE categories.id = ordered.id;
