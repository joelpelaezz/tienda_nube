-- C4-TRACE: provider IDs are globally unique; exceptions remain visible for reconciliation.
CREATE TABLE "order_payments" (
  "provider_payment_id" text PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL REFERENCES "orders"("id"),
  "amount" integer NOT NULL,
  "refunded_amount" integer NOT NULL DEFAULT 0,
  "provider_status" text NOT NULL,
  "reconciliation_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "order_payments_order_id_idx" ON "order_payments" ("order_id");
