"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notes, videos, videoTopics, topics } from "@/db/schema";
import { markTopicsStale, refreshTopicDigest } from "@/lib/pipeline";
import { slugify } from "@/lib/slug";

export async function saveNote(videoId: string, body: string): Promise<void> {
  await db
    .insert(notes)
    .values({ videoId, body, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: notes.videoId,
      set: { body, updatedAt: new Date() },
    });
  revalidatePath(`/video/${videoId}`);
}

export async function deleteVideo(videoId: string): Promise<void> {
  const affected = await db
    .select({ topicId: videoTopics.topicId })
    .from(videoTopics)
    .where(eq(videoTopics.videoId, videoId));

  await db.delete(videos).where(eq(videos.id, videoId));

  const topicIds = [...new Set(affected.map((t) => t.topicId))];
  await markTopicsStale(topicIds);
  for (const topicId of topicIds) {
    await refreshTopicDigest(topicId);
  }

  revalidatePath("/");
  revalidatePath("/topics");
}

export async function renameTopic(
  topicId: string,
  newName: string,
): Promise<{ slug: string } | { error: string }> {
  const name = newName.trim();
  if (!name) return { error: "Name cannot be empty." };
  const slug = slugify(name);
  if (!slug) return { error: "Name must contain at least one letter or number." };

  try {
    await db.update(topics).set({ name, slug }).where(eq(topics.id, topicId));
  } catch {
    return { error: "A topic with that name already exists." };
  }

  revalidatePath("/topics");
  revalidatePath(`/topics/${slug}`);
  return { slug };
}

export async function mergeTopics(
  sourceTopicId: string,
  targetTopicId: string,
): Promise<void> {
  if (sourceTopicId === targetTopicId) return;

  const sourceLinks = await db
    .select({ videoId: videoTopics.videoId })
    .from(videoTopics)
    .where(eq(videoTopics.topicId, sourceTopicId));

  for (const { videoId } of sourceLinks) {
    await db
      .insert(videoTopics)
      .values({ videoId, topicId: targetTopicId })
      .onConflictDoNothing();
  }

  await db.delete(videoTopics).where(eq(videoTopics.topicId, sourceTopicId));
  await db.delete(topics).where(eq(topics.id, sourceTopicId));

  await markTopicsStale([targetTopicId]);
  await refreshTopicDigest(targetTopicId);

  revalidatePath("/topics");
}
