-- C4-TRACE: track communication channel activity without storing WhatsApp conversations.
CREATE TABLE "communication_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "channel" text NOT NULL,
  "event_type" text NOT NULL,
  "name" text,
  "email" text,
  "phone" text,
  "source" text DEFAULT 'unknown' NOT NULL,
  "product_id" integer,
  "order_id" integer,
  "href" text,
  "created_at" timestamp DEFAULT now()
);
