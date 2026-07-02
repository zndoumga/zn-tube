import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  channels,
  videos,
  recapItems,
  topics,
  videoTopics,
} from "@/db/schema";
import { fetchMetadata, fetchTranscript } from "./youtube";
import { extractRecap, generateTopicDigest } from "./claude";
import { slugify } from "./slug";

/**
 * Resolves a list of topic names (as suggested by Claude for one video) to
 * topic row ids, reusing existing topics via case-insensitive name/slug
 * match and creating new ones only when nothing matches. This is the
 * safety net behind the prompt-level instruction to reuse existing topic
 * names verbatim.
 */
async function resolveTopicIds(names: string[]): Promise<string[]> {
  const ids: string[] = [];

  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;

    const existing = await db.query.topics.findFirst({
      where: (t, { or, ilike, eq: eqFn }) =>
        or(ilike(t.name, name), eqFn(t.slug, slug)),
    });

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const [created] = await db
      .insert(topics)
      .values({ name, slug })
      .onConflictDoNothing({ target: topics.slug })
      .returning({ id: topics.id });

    if (created) {
      ids.push(created.id);
    } else {
      // Lost a race against a concurrent insert with the same slug — fetch it.
      const raced = await db.query.topics.findFirst({
        where: (t, { eq: eqFn }) => eqFn(t.slug, slug),
      });
      if (raced) ids.push(raced.id);
    }
  }

  return [...new Set(ids)];
}

async function regenerateDigest(topicId: string): Promise<void> {
  const topic = await db.query.topics.findFirst({
    where: (t, { eq: eqFn }) => eqFn(t.id, topicId),
  });
  if (!topic) return;

  const members = await db
    .select({
      title: videos.title,
      channelName: channels.name,
      summary: videos.summary,
      videoId: videos.id,
    })
    .from(videoTopics)
    .innerJoin(videos, eq(videoTopics.videoId, videos.id))
    .leftJoin(channels, eq(videos.channelId, channels.id))
    .where(eq(videoTopics.topicId, topicId));

  if (members.length === 0) {
    await db
      .update(topics)
      .set({ digest: null, digestStale: false, digestUpdatedAt: new Date() })
      .where(eq(topics.id, topicId));
    return;
  }

  const videoIds = members.map((m) => m.videoId);
  const items = await db
    .select()
    .from(recapItems)
    .where(inArray(recapItems.videoId, videoIds));

  const digestInput = members.map((m) => ({
    title: m.title,
    channelName: m.channelName,
    summary: m.summary,
    tips: items
      .filter((i) => i.videoId === m.videoId && i.kind === "tip")
      .map((i) => i.text),
    actionPoints: items
      .filter((i) => i.videoId === m.videoId && i.kind === "action")
      .map((i) => i.text),
  }));

  const digest = await generateTopicDigest(topic.name, digestInput);

  await db
    .update(topics)
    .set({ digest, digestStale: false, digestUpdatedAt: new Date() })
    .where(eq(topics.id, topicId));
}

/**
 * Marks a topic stale and regenerates its digest immediately. Exported so
 * mutations outside the main pipeline (delete video, merge/rename topics,
 * the manual "regenerate" button) can reuse the same logic.
 */
export async function refreshTopicDigest(topicId: string): Promise<void> {
  await regenerateDigest(topicId);
}

export async function markTopicsStale(topicIds: string[]): Promise<void> {
  if (topicIds.length === 0) return;
  await db
    .update(topics)
    .set({ digestStale: true })
    .where(inArray(topics.id, topicIds));
}

export class PipelineError extends Error {}

/**
 * The full async processing pipeline for one video: fetch metadata,
 * fetch transcript, extract a structured recap via Claude, persist it,
 * resolve/attach topics, and regenerate any topic digests touched.
 *
 * Designed to run inside `waitUntil()` after the creating request has
 * already returned — every step updates `videos.status` so the client can
 * poll for progress.
 */
export async function processVideo(videoId: string): Promise<void> {
  try {
    await db
      .update(videos)
      .set({ status: "processing", error: null })
      .where(eq(videos.id, videoId));

    const video = await db.query.videos.findFirst({
      where: (v, { eq: eqFn }) => eqFn(v.id, videoId),
    });
    if (!video) throw new PipelineError(`Video ${videoId} not found`);

    // 1. Metadata
    const metadata = await fetchMetadata(video.youtubeId);

    let channelId: string | null = null;
    if (metadata.channelYoutubeId) {
      const [channel] = await db
        .insert(channels)
        .values({
          youtubeChannelId: metadata.channelYoutubeId,
          name: metadata.channelName ?? "Unknown channel",
          thumbnail: metadata.channelThumbnail,
        })
        .onConflictDoUpdate({
          target: channels.youtubeChannelId,
          set: {
            name: metadata.channelName ?? "Unknown channel",
            thumbnail: metadata.channelThumbnail,
          },
        })
        .returning({ id: channels.id });
      channelId = channel?.id ?? null;
    }

    await db
      .update(videos)
      .set({
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        durationSeconds: metadata.durationSeconds,
        publishedAt: metadata.publishedAt,
        channelId,
      })
      .where(eq(videos.id, videoId));

    // 2. Transcript
    const transcript = await fetchTranscript(video.youtubeId);

    if (!transcript) {
      await db
        .update(videos)
        .set({ transcriptSource: "none", status: "ready" })
        .where(eq(videos.id, videoId));
      return;
    }

    // 3. Claude extraction
    const existingTopics = await db
      .select({ name: topics.name })
      .from(topics);

    const recap = await extractRecap({
      title: metadata.title,
      channelName: metadata.channelName,
      existingTopics: existingTopics.map((t) => t.name),
      transcript: transcript.text,
    });

    // 4. Persist recap
    await db
      .update(videos)
      .set({
        transcript: transcript.text,
        transcriptSource: "captions",
        summary: recap.summary,
        contentType: recap.contentType,
      })
      .where(eq(videos.id, videoId));

    await db.delete(recapItems).where(eq(recapItems.videoId, videoId));

    const newItems = [
      ...recap.actionPoints.map((text, i) => ({
        videoId,
        kind: "action" as const,
        position: i,
        text,
      })),
      ...recap.tips.map((text, i) => ({
        videoId,
        kind: "tip" as const,
        position: i,
        text,
      })),
      ...recap.steps.map((text, i) => ({
        videoId,
        kind: "step" as const,
        position: i,
        text,
      })),
    ];
    if (newItems.length > 0) {
      await db.insert(recapItems).values(newItems);
    }

    // 5. Resolve + attach topics
    const previousTopicRows = await db
      .select({ topicId: videoTopics.topicId })
      .from(videoTopics)
      .where(eq(videoTopics.videoId, videoId));
    const previousTopicIds = previousTopicRows.map((r) => r.topicId);

    const newTopicIds = await resolveTopicIds(recap.topics);

    await db.delete(videoTopics).where(eq(videoTopics.videoId, videoId));
    if (newTopicIds.length > 0) {
      await db
        .insert(videoTopics)
        .values(newTopicIds.map((topicId) => ({ videoId, topicId })));
    }

    // 6. Mark touched topics stale and regenerate their digests inline
    const touchedTopicIds = [...new Set([...previousTopicIds, ...newTopicIds])];
    await markTopicsStale(touchedTopicIds);
    for (const topicId of touchedTopicIds) {
      await regenerateDigest(topicId);
    }

    await db
      .update(videos)
      .set({ status: "ready" })
      .where(eq(videos.id, videoId));
  } catch (err) {
    console.error(`[pipeline] Failed to process video ${videoId}:`, err);
    await db
      .update(videos)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(videos.id, videoId));
  }
}
