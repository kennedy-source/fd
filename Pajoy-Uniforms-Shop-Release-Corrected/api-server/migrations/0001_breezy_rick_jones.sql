CREATE TABLE "pajoy_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"request_id" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pajoy_audit_events" ADD CONSTRAINT "pajoy_audit_events_shop_id_pajoy_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."pajoy_shops"("id") ON DELETE no action ON UPDATE no action;