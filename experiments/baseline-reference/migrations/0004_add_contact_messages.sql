CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "message" text NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "ip_hash" text,
  "created_at" timestamp DEFAULT now(),
  "read_at" timestamp,
  "replied_at" timestamp
);
