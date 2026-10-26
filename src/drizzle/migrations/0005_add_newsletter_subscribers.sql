CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text,
  "email" text NOT NULL,
  "status" text DEFAULT 'subscribed' NOT NULL,
  "source" text DEFAULT 'homepage' NOT NULL,
  "consent_at" timestamp DEFAULT now(),
  "subscribed_at" timestamp DEFAULT now(),
  "unsubscribed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
