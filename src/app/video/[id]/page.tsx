import { notFound } from "next/navigation";
import Link from "next/link";
import { getVideoDetail } from "@/lib/queries";
import RecapView from "@/components/RecapView";
import NotesEditor from "@/components/NotesEditor";
import VideoActions from "@/components/VideoActions";
import StatusBadge from "@/components/StatusBadge";
import StatusPoller from "@/components/StatusPoller";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await getVideoDetail(id);
  if (!video) notFound();

  const isPending = video.status === "pending" || video.status === "processing";

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      {isPending && <StatusPoller ids={[video.id]} />}

      <Link
        href="/"
        className="mb-4 inline-block text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Back to library
      </Link>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            {video.title ?? "Untitled video"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {video.channel?.name ?? "Unknown creator"}
            {video.publishedAt && ` · ${formatDate(video.publishedAt)}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={video.status} />
            {video.contentType && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                {video.contentType.replace("_", " ")}
              </span>
            )}
            {video.topics.map((t) => (
              <Link
                key={t.id}
                href={`/topics/${t.slug}`}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 hover:bg-blue-100"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>
        <VideoActions videoId={video.id} status={video.status} />
      </div>

      <a
        href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 inline-block text-sm text-blue-600 hover:underline"
      >
        Watch on YouTube ↗
      </a>

      <RecapView video={video} />

      <div className="mt-6">
        <NotesEditor videoId={video.id} initialBody={video.note} />
      </div>
    </main>
  );
}
