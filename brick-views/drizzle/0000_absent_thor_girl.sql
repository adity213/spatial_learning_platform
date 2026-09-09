CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"board_state" jsonb NOT NULL,
	"is_correct" boolean NOT NULL,
	"attempt_number" integer NOT NULL,
	"diagnoses" jsonb
);
--> statement-breakpoint
CREATE TABLE "hint_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"attempt_number" integer NOT NULL,
	"ai_response" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"access_code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "participants_access_code_unique" UNIQUE("access_code")
);
--> statement-breakpoint
CREATE TABLE "puzzles" (
	"id" text PRIMARY KEY NOT NULL,
	"state_data" jsonb NOT NULL,
	"time_limit_seconds" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"puzzle_id" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"total_time_seconds" integer,
	"is_solved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hint_usages" ADD CONSTRAINT "hint_usages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_session_id_idx" ON "attempts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "hint_usages_session_id_idx" ON "hint_usages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_participant_id_idx" ON "sessions" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "sessions_puzzle_id_idx" ON "sessions" USING btree ("puzzle_id");