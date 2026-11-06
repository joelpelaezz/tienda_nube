CREATE TABLE "payment_exceptions" (
  "provider_payment_id" text NOT NULL,
  "reason" text NOT NULL,
  "order_id" integer REFERENCES "orders"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("provider_payment_id", "reason")
);
