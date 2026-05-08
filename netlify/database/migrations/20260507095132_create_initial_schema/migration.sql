CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"color" text DEFAULT '#00ff88' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"icon" text,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contests" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"issue_date" timestamp,
	"condition_type" text DEFAULT 'per_contract' NOT NULL,
	"target_type" text DEFAULT 'tvv' NOT NULL,
	"bonus_tiers" text NOT NULL,
	"poster_url" text DEFAULT '' NOT NULL,
	"participants" text DEFAULT '[]' NOT NULL,
	"use_phase2" boolean DEFAULT false NOT NULL,
	"phase2_start_date" timestamp,
	"phase2_end_date" timestamp,
	"bonus_tiers2" text DEFAULT '[]' NOT NULL,
	"use_secondary_condition" boolean DEFAULT false NOT NULL,
	"secondary_afyp_min" real DEFAULT 0 NOT NULL,
	"secondary_ip_min" real DEFAULT 0 NOT NULL,
	"hide_not_achieved" boolean DEFAULT false NOT NULL,
	"use_tvvm_filter" boolean DEFAULT false NOT NULL,
	"include_own_nyd" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" text PRIMARY KEY,
	"contract_number" text NOT NULL UNIQUE,
	"agent_code" text DEFAULT '' NOT NULL,
	"agent_name" text NOT NULL,
	"position" text DEFAULT '' NOT NULL,
	"ban" text DEFAULT '' NOT NULL,
	"nhom" text DEFAULT '' NOT NULL,
	"ma_nhom" text DEFAULT '' NOT NULL,
	"leader_agent_code" text DEFAULT '' NOT NULL,
	"recruiter_code" text DEFAULT '' NOT NULL,
	"start_date" timestamp,
	"effective_date" timestamp NOT NULL,
	"issue_date" timestamp NOT NULL,
	"fyp" real DEFAULT 0 NOT NULL,
	"afyp" real DEFAULT 0 NOT NULL,
	"tinh_luot" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"url" text,
	"description" text,
	"icon" text DEFAULT 'globe' NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"link_type" text DEFAULT 'web' NOT NULL,
	"file_url" text,
	"file_name" text,
	"file_type" text,
	"thumbnail" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY,
	"key" text NOT NULL UNIQUE,
	"value" text,
	"updated_at" timestamp DEFAULT now()
);
