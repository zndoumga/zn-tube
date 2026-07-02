CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"youtube_channel_id" text NOT NULL,
	"name" text NOT NULL,
	"thumbnail" text,
	CONSTRAINT "channels_youtube_channel_id_unique" UNIQUE("youtube_channel_id")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"video_id" uuid PRIMARY KEY NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recap_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"digest" text,
	"digest_updated_at" timestamp with time zone,
	"digest_stale" boolean DEFAULT true NOT NULL,
	CONSTRAINT "topics_name_unique" UNIQUE("name"),
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "video_topics" (
	"video_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	CONSTRAINT "video_topics_video_id_topic_id_pk" PRIMARY KEY("video_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"youtube_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"channel_id" uuid,
	"thumbnail" text,
	"duration_seconds" integer,
	"published_at" timestamp with time zone,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_type" text,
	"summary" text,
	"transcript" text,
	"transcript_source" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	CONSTRAINT "videos_youtube_id_unique" UNIQUE("youtube_id")
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recap_items" ADD CONSTRAINT "recap_items_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_topics" ADD CONSTRAINT "video_topics_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_topics" ADD CONSTRAINT "video_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_topics_topic_id_idx" ON "video_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "videos_status_idx" ON "videos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "videos_channel_id_idx" ON "videos" USING btree ("channel_id");