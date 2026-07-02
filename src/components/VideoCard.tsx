import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { VideoListItem } from "@/lib/queries";

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function VideoCard({ video }: { video: VideoListItem }) {
  const duration = formatDuration(video.durationSeconds);

  return (
    <Link
      href={`/video/${video.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="relative aspect-video w-full bg-neutral-100">
        {video.thumbnail ? (
          // Using a plain <img> avoids configuring next/image remote patterns
          // for YouTube's thumbnail CDN.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail}
            alt={video.title ?? "Video thumbnail"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
            No thumbnail
          </div>
        )}
        {duration && (
          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {duration}
          </span>
        )}
        {video.status !== "ready" && (
          <div className="absolute left-1 top-1">
            <StatusBadge status={video.status} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-900">
          {video.title ?? "Untitled video"}
        </h3>
        <p className="text-xs text-neutral-500">
          {video.channel?.name ?? "Unknown creator"}
        </p>
        {(video.contentType || video.topics.length > 0) && (
          <div className="mt-auto flex flex-wrap gap-1 pt-2">
            {video.contentType && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                {video.contentType.replace("_", " ")}
              </span>
            )}
            {video.topics.slice(0, 3).map((t) => (
              <span
                key={t.id}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
