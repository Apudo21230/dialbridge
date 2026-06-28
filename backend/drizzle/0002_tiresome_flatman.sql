CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integrator_id" uuid NOT NULL,
	"booking_id" varchar(128),
	"provider" varchar(40) DEFAULT 'mock' NOT NULL,
	"provider_session_id" varchar(128) NOT NULL,
	"virtual_number" varchar(20),
	"status" varchar(20) DEFAULT 'created' NOT NULL,
	"billable_seconds" integer DEFAULT 0 NOT NULL,
	"recording_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_integrator_id_integrators_id_fk" FOREIGN KEY ("integrator_id") REFERENCES "public"."integrators"("id") ON DELETE no action ON UPDATE no action;