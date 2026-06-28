CREATE TABLE "end_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integrator_id" uuid NOT NULL,
	"user_ref" varchar(128) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "end_users" ADD CONSTRAINT "end_users_integrator_id_integrators_id_fk" FOREIGN KEY ("integrator_id") REFERENCES "public"."integrators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "end_users_integrator_user_uniq" ON "end_users" USING btree ("integrator_id","user_ref");