CREATE TABLE "pajoy_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"time" text NOT NULL,
	"actor" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pajoy_branches" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"manager" text NOT NULL,
	"phone" text NOT NULL,
	"inventory_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sales_today" numeric(12, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "pajoy_branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pajoy_customers" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"school" text,
	"uniform_product_ids" text[],
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"credit_limit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pajoy_document_sequences" (
	"key" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"next_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pajoy_dtf_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"job_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"order_number" text,
	"artwork_name" text NOT NULL,
	"garment_description" text NOT NULL,
	"quantity" integer NOT NULL,
	"size" text,
	"status" text DEFAULT 'Queued' NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pajoy_dtf_jobs_job_number_unique" UNIQUE("job_number")
);
--> statement-breakpoint
CREATE TABLE "pajoy_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"product_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"reorder_point" integer DEFAULT 10 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pajoy_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"order_number" text NOT NULL,
	"idempotency_key" text,
	"customer_name" text NOT NULL,
	"customer_type" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(12, 2) NOT NULL,
	"due_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"branch_id" text NOT NULL,
	"item_summary" text,
	"embroidery" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text,
	CONSTRAINT "pajoy_orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "pajoy_orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "pajoy_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"receipt_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_number" text,
	"created_by_user_id" text,
	CONSTRAINT "pajoy_payments_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE "pajoy_products" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"garment_type" text,
	"pattern" text,
	"check_colors" text[],
	"collar_style" text,
	"sleeve_style" text,
	"unit" text NOT NULL,
	"sizes" text[],
	"colors" text[],
	"school" text,
	"school_logo" text,
	"badge_name" text,
	"badge_school" text,
	"badge_stock" integer DEFAULT 0 NOT NULL,
	"badge_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cost_price" numeric(12, 2) NOT NULL,
	"retail_price" numeric(12, 2) NOT NULL,
	"wholesale_price" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	CONSTRAINT "pajoy_products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "pajoy_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pajoy_shops" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "pajoy_shops_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pajoy_users" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"password_salt" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"branch_id" text,
	"register_id" text,
	CONSTRAINT "pajoy_users_username_unique" UNIQUE("username"),
	CONSTRAINT "pajoy_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "pajoy_activity" ADD CONSTRAINT "pajoy_activity_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_branches" ADD CONSTRAINT "pajoy_branches_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_customers" ADD CONSTRAINT "pajoy_customers_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_document_sequences" ADD CONSTRAINT "pajoy_document_sequences_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_dtf_jobs" ADD CONSTRAINT "pajoy_dtf_jobs_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_inventory" ADD CONSTRAINT "pajoy_inventory_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_orders" ADD CONSTRAINT "pajoy_orders_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_payments" ADD CONSTRAINT "pajoy_payments_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_products" ADD CONSTRAINT "pajoy_products_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_users" ADD CONSTRAINT "pajoy_users_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;