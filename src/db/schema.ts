import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const channels = pgTable("channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  youtubeChannelId: text("youtube_channel_id").notNull().unique(),
  name: text("name").notNull(),
  thumbnail: text("thumbnail"),
});

export const contentTypeValues = [
  "tutorial",
  "opinion",
  "review",
  "case_study",
  "news",
  "talk",
  "other",
] as const;
export type ContentType = (typeof contentTypeValues)[number];

export const transcriptSourceValues = ["captions", "whisper", "none"] as const;
export type TranscriptSource = (typeof transcriptSourceValues)[number];

export const videoStatusValues = [
  "pending",
  "processing",
  "ready",
  "failed",
] as const;
export type VideoStatus = (typeof videoStatusValues)[number];

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    youtubeId: text("youtube_id").notNull().unique(),
    url: text("url").notNull(),
    title: text("title"),
    channelId: uuid("channel_id").references(() => channels.id, {
      onDelete: "set null",
    }),
    thumbnail: text("thumbnail"),
    durationSeconds: integer("duration_seconds"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    savedAt: timestamp("saved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    contentType: text("content_type", { enum: contentTypeValues }),
    summary: text("summary"),
    transcript: text("transcript"),
    transcriptSource: text("transcript_source", {
      enum: transcriptSourceValues,
    }),
    status: text("status", { enum: videoStatusValues })
      .notNull()
      .default("pending"),
    error: text("error"),
  },
  (table) => [
    index("videos_status_idx").on(table.status),
    index("videos_channel_id_idx").on(table.channelId),
  ],
);

export const recapItemKindValues = ["action", "tip", "step"] as const;
export type RecapItemKind = (typeof recapItemKindValues)[number];

export const recapItems = pgTable("recap_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  videoId: uuid("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: recapItemKindValues }).notNull(),
  position: integer("position").notNull().default(0),
  text: text("text").notNull(),
});

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  digest: text("digest"),
  digestUpdatedAt: timestamp("digest_updated_at", { withTimezone: true }),
  digestStale: boolean("digest_stale").notNull().default(true),
});

export const videoTopics = pgTable(
  "video_topics",
  {
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.videoId, table.topicId] }),
    index("video_topics_topic_id_idx").on(table.topicId),
  ],
);

export const notes = pgTable("notes", {
  videoId: uuid("video_id")
    .primaryKey()
    .references(() => videos.id, { onDelete: "cascade" }),
  body: text("body").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
