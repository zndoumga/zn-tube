import { asc } from "drizzle-orm";
import { db } from "@/db";
import { channels, topics } from "@/db/schema";
import type { ContentType, VideoStatus, TranscriptSource } from "@/db/schema";

export interface VideoListItem {
  id: string;
  youtubeId: string;
  title: string | null;
  thumbnail: string | null;
  durationSeconds: number | null;
  publishedAt: Date | null;
  savedAt: Date;
  contentType: ContentType | null;
  status: VideoStatus;
  error: string | null;
  transcriptSource: TranscriptSource | null;
  channel: { id: string; name: string; thumbnail: string | null } | null;
  topics: { id: string; name: string; slug: string }[];
}

export interface VideoFilters {
  q?: string;
  channelId?: string;
  topicId?: string;
  contentType?: ContentType;
}

export async function listVideos(
  filters: VideoFilters = {},
): Promise<VideoListItem[]> {
  const rows = await db.query.videos.findMany({
    where: (v, { and: andFn, ilike: ilikeFn, eq: eqFn }) => {
      const conditions = [];
      if (filters.q) conditions.push(ilikeFn(v.title, `%${filters.q}%`));
      if (filters.channelId)
        conditions.push(eqFn(v.channelId, filters.channelId));
      if (filters.contentType)
        conditions.push(eqFn(v.contentType, filters.contentType));
      return conditions.length > 0 ? andFn(...conditions) : undefined;
    },
    with: {
      channel: true,
      videoTopics: { with: { topic: true } },
    },
    orderBy: (v, { desc }) => [desc(v.savedAt)],
  });

  const items: VideoListItem[] = rows.map((r) => ({
    id: r.id,
    youtubeId: r.youtubeId,
    title: r.title,
    thumbnail: r.thumbnail,
    durationSeconds: r.durationSeconds,
    publishedAt: r.publishedAt,
    savedAt: r.savedAt,
    contentType: r.contentType,
    status: r.status,
    error: r.error,
    transcriptSource: r.transcriptSource,
    channel: r.channel
      ? { id: r.channel.id, name: r.channel.name, thumbnail: r.channel.thumbnail }
      : null,
    topics: r.videoTopics.map((vt) => ({
      id: vt.topic.id,
      name: vt.topic.name,
      slug: vt.topic.slug,
    })),
  }));

  if (filters.topicId) {
    return items.filter((i) => i.topics.some((t) => t.id === filters.topicId));
  }

  return items;
}

export async function listChannelsForFilter() {
  return db
    .select({ id: channels.id, name: channels.name })
    .from(channels)
    .orderBy(asc(channels.name));
}

export async function listTopicsForFilter() {
  return db
    .select({ id: topics.id, name: topics.name, slug: topics.slug })
    .from(topics)
    .orderBy(asc(topics.name));
}

export interface VideoDetail extends VideoListItem {
  summary: string | null;
  transcript: string | null;
  actionPoints: string[];
  tips: string[];
  steps: string[];
  note: string;
}

export async function getVideoDetail(id: string): Promise<VideoDetail | null> {
  const row = await db.query.videos.findFirst({
    where: (v, { eq: eqFn }) => eqFn(v.id, id),
    with: {
      channel: true,
      videoTopics: { with: { topic: true } },
      recapItems: { orderBy: (ri, { asc: ascFn }) => [ascFn(ri.position)] },
      note: true,
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    youtubeId: row.youtubeId,
    title: row.title,
    thumbnail: row.thumbnail,
    durationSeconds: row.durationSeconds,
    publishedAt: row.publishedAt,
    savedAt: row.savedAt,
    contentType: row.contentType,
    status: row.status,
    error: row.error,
    transcriptSource: row.transcriptSource,
    channel: row.channel
      ? { id: row.channel.id, name: row.channel.name, thumbnail: row.channel.thumbnail }
      : null,
    topics: row.videoTopics.map((vt) => ({
      id: vt.topic.id,
      name: vt.topic.name,
      slug: vt.topic.slug,
    })),
    summary: row.summary,
    transcript: row.transcript,
    actionPoints: row.recapItems.filter((i) => i.kind === "action").map((i) => i.text),
    tips: row.recapItems.filter((i) => i.kind === "tip").map((i) => i.text),
    steps: row.recapItems.filter((i) => i.kind === "step").map((i) => i.text),
    note: row.note?.body ?? "",
  };
}

export interface TopicListItem {
  id: string;
  name: string;
  slug: string;
  videoCount: number;
  digestStale: boolean;
}

export async function listTopicsIndex(): Promise<TopicListItem[]> {
  const rows = await db.query.topics.findMany({
    with: { videoTopics: true },
    orderBy: (t, { asc: ascFn }) => [ascFn(t.name)],
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    videoCount: r.videoTopics.length,
    digestStale: r.digestStale,
  }));
}

export interface TopicDetail {
  id: string;
  name: string;
  slug: string;
  digest: string | null;
  digestUpdatedAt: Date | null;
  digestStale: boolean;
  videos: VideoListItem[];
}

export async function getTopicBySlug(slug: string): Promise<TopicDetail | null> {
  const topic = await db.query.topics.findFirst({
    where: (t, { eq: eqFn }) => eqFn(t.slug, slug),
  });
  if (!topic) return null;

  const videos = await listVideos({ topicId: topic.id });

  return {
    id: topic.id,
    name: topic.name,
    slug: topic.slug,
    digest: topic.digest,
    digestUpdatedAt: topic.digestUpdatedAt,
    digestStale: topic.digestStale,
    videos,
  };
}
