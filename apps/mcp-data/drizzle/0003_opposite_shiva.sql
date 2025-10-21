CREATE TYPE "public"."server_moderation_status" AS ENUM('pending', 'approved', 'rejected', 'disabled', 'flagged');--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "moderation_status" "server_moderation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "moderation_notes" text;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "quality_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_moderation_status" ON "mcp_servers" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_score" ON "mcp_servers" USING btree ("quality_score");