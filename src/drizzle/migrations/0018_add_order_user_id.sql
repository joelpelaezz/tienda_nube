-- C4-TRACE: nullable owner preserves legacy orders without granting payment access.
ALTER TABLE "orders" ADD COLUMN "user_id" integer REFERENCES "users"("id");
