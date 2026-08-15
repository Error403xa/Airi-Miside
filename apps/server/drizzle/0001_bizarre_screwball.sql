CREATE TABLE "user_module_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"module_name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "user_module_configs_owner_id_module_name_unique" UNIQUE("owner_id","module_name")
);
--> statement-breakpoint
ALTER TABLE "user_module_configs" ADD CONSTRAINT "user_module_configs_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;