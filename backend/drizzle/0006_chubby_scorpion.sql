ALTER TABLE "calls" ADD COLUMN "caller_ref" varchar(128);--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "receiver_ref" varchar(128);--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "ticket" varchar(128);--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "ringing_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "answered_at" timestamp with time zone;