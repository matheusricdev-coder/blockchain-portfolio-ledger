CREATE TABLE IF NOT EXISTS "checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"last_processed_block" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkpoints_chain_id_unique" UNIQUE("chain_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"token_address" varchar(42) NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"reference_event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raw_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"block_number" integer NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"log_index" integer NOT NULL,
	"from_address" varchar(42) NOT NULL,
	"to_address" varchar(42) NOT NULL,
	"token_address" varchar(42) NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_raw_events_event_id" UNIQUE("chain_id","block_number","tx_hash","log_index")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"token_address" varchar(42) NOT NULL,
	"balance" numeric(78, 0) NOT NULL,
	"snapshot_date" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_reference_event_id_raw_events_id_fk" FOREIGN KEY ("reference_event_id") REFERENCES "public"."raw_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ledger_wallet_token" ON "ledger_entries" USING btree ("wallet_address","token_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ledger_created_at" ON "ledger_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_raw_events_block" ON "raw_events" USING btree ("chain_id","block_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_snapshots_wallet_token_date" ON "snapshots" USING btree ("wallet_address","token_address","snapshot_date");