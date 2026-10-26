CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"min_purchase" integer,
	"max_uses" integer,
	"used_count" integer DEFAULT 0,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"dni" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"product_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0,
	"coupon_code" text,
	"notes" text,
	"mp_payment_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"discount_percent" integer,
	"logo_url" text,
	"position" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" integer NOT NULL,
	"category_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"movement_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"stock_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password" text,
	"role" text DEFAULT 'customer',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "variant_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_type_id" integer NOT NULL,
	"value" text NOT NULL,
	"position" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "variant_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "product_images" ALTER COLUMN "position" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "src" text DEFAULT 'url';--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "option_ids" text[];--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "variant_type_id" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "weight" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "length" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "barcode" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "is_visible" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_visible" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "length" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "barcode" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" text DEFAULT 'physical';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_options" ADD CONSTRAINT "variant_options_variant_type_id_variant_types_id_fk" FOREIGN KEY ("variant_type_id") REFERENCES "public"."variant_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_movements_variant_id_idx" ON "stock_movements" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_variant_type_id_variant_types_id_fk" FOREIGN KEY ("variant_type_id") REFERENCES "public"."variant_types"("id") ON DELETE no action ON UPDATE no action;