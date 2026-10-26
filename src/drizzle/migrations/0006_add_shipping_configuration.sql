ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "postal_code" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_method" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_cost" integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS "shipping_methods" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "carrier" text DEFAULT 'rules' NOT NULL,
  "base_cost" integer DEFAULT 0 NOT NULL,
  "free_from" integer,
  "estimated_days" text,
  "is_active" boolean DEFAULT false NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "shipping_methods_code_unique" UNIQUE("code")
);

CREATE TABLE IF NOT EXISTS "shipping_rules" (
  "id" serial PRIMARY KEY NOT NULL,
  "shipping_method_id" integer NOT NULL REFERENCES "shipping_methods"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "postal_prefix" text DEFAULT '' NOT NULL,
  "cost" integer DEFAULT 0 NOT NULL,
  "free_from" integer,
  "estimated_days" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "position" integer DEFAULT 0 NOT NULL
);

INSERT INTO "shipping_methods" ("code", "name", "carrier", "base_cost", "estimated_days", "is_active", "position")
VALUES ('standard', 'Envío estándar', 'rules', 0, '3 a 7 días hábiles', false, 0)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "shipping_rules" ("shipping_method_id", "name", "postal_prefix", "cost", "estimated_days", "position")
SELECT id, 'Regla general', '', 0, '3 a 7 días hábiles', 0
FROM "shipping_methods"
WHERE code = 'standard'
  AND NOT EXISTS (
    SELECT 1 FROM "shipping_rules" rule
    WHERE rule.shipping_method_id = "shipping_methods".id
  );
