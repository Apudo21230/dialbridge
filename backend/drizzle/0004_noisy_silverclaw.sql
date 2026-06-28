CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" varchar(16) NOT NULL,
	"amount" bigint NOT NULL,
	"ref_call_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integrator_id" uuid NOT NULL,
	"user_ref" varchar(128) NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "user_ref" varchar(128);--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "rate_per_minute" integer;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "max_seconds" integer;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "cost" integer;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_integrator_id_integrators_id_fk" FOREIGN KEY ("integrator_id") REFERENCES "public"."integrators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_integrator_user_uniq" ON "wallets" USING btree ("integrator_id","user_ref");