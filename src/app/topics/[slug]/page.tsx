import { notFound } from "next/navigation";
import Link from "next/link";
import { getTopicBySlug, listTopicsForFilter } from "@/lib/queries";
import TopicDigest from "@/components/TopicDigest";
import TopicControls from "@/components/TopicControls";
import VideoGrid from "@/components/VideoGrid";

export const dynamic = "force-dynamic";

function formatDateTime(d: Date | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();

  const allTopics = await listTopicsForFilter();
  const otherTopics = allTopics.filter((t) => t.id !== topic.id);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <Link
        href="/topics"
        className="mb-4 inline-block text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← All topics
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {topic.name}
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            {topic.digestStale
              ? "Digest is updating…"
              : topic.digestUpdatedAt
                ? `Digest updated ${formatDateTime(topic.digestUpdatedAt)}`
                : "No digest yet"}
          </p>
        </div>
        <TopicControls
          topicId={topic.id}
          currentName={topic.name}
          otherTopics={otherTopics}
        />
      </div>

      <div className="mb-8">
        <TopicDigest digest={topic.digest} />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Videos in this topic
      </h2>
      {topic.videos.length === 0 ? (
        <p className="text-sm text-neutral-500">No videos in this topic.</p>
      ) : (
        <VideoGrid videos={topic.videos} groupBy="none" />
      )}
    </main>
  );
}
