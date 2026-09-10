CREATE TABLE "pajoy_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "pajoy_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pajoy_category_sizes" (
	"category_id" text NOT NULL,
	"size_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pajoy_colors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hex_code" text,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "pajoy_colors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pajoy_inventory_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"product_id" text NOT NULL,
	"variant_id" text,
	"branch_id" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"reference" text,
	"user_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pajoy_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"size" text NOT NULL,
	"color" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pajoy_product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"sku" text NOT NULL,
	"size" text NOT NULL,
	"color" text NOT NULL,
	"cost_price" numeric(12, 2) NOT NULL,
	"retail_price" numeric(12, 2) NOT NULL,
	"wholesale_price" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	CONSTRAINT "pajoy_product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "pajoy_school_products" (
	"school_id" text NOT NULL,
	"product_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pajoy_sizes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pajoy_category_sizes" ADD CONSTRAINT "pajoy_category_sizes_category_id_pajoy_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."pajoy_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_category_sizes" ADD CONSTRAINT "pajoy_category_sizes_size_id_pajoy_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."pajoy_sizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_inventory_movements" ADD CONSTRAINT "pajoy_inventory_movements_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_inventory_movements" ADD CONSTRAINT "pajoy_inventory_movements_product_id_pajoy_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pajoy_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_inventory_movements" ADD CONSTRAINT "pajoy_inventory_movements_variant_id_pajoy_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."pajoy_product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_order_items" ADD CONSTRAINT "pajoy_order_items_order_id_pajoy_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."pajoy_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_order_items" ADD CONSTRAINT "pajoy_order_items_product_id_pajoy_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pajoy_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_order_items" ADD CONSTRAINT "pajoy_order_items_variant_id_pajoy_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."pajoy_product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pajoy_product_variants" ADD CONSTRAINT "pajoy_product_variants_product_id_pajoy_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."pajoy_products"("id") ON DELETE no action ON UPDATE no action;