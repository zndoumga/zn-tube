import VideoCard from "./VideoCard";
import StatusPoller from "./StatusPoller";
import type { VideoListItem } from "@/lib/queries";

interface Group {
  label: string;
  videos: VideoListItem[];
}

const FLAT_LABEL = "__flat__";

function pushTo(map: Map<string, VideoListItem[]>, key: string, v: VideoListItem) {
  const arr = map.get(key) ?? [];
  arr.push(v);
  map.set(key, arr);
}

function groupByKey(
  videos: VideoListItem[],
  keyFn: (v: VideoListItem) => string,
): Group[] {
  const map = new Map<string, VideoListItem[]>();
  for (const v of videos) pushTo(map, keyFn(v), v);
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, vids]) => ({ label, videos: vids }));
}

function groupVideos(videos: VideoListItem[], groupBy: string): Group[] {
  if (groupBy === "creator") {
    return groupByKey(videos, (v) => v.channel?.name ?? "Unknown creator");
  }
  if (groupBy === "type") {
    return groupByKey(
      videos,
      (v) => v.contentType?.replace("_", " ") ?? "Uncategorized",
    );
  }
  if (groupBy === "topic") {
    const map = new Map<string, VideoListItem[]>();
    for (const v of videos) {
      if (v.topics.length === 0) {
        pushTo(map, "No topic yet", v);
      } else {
        for (const t of v.topics) pushTo(map, t.name, v);
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, vids]) => ({ label, videos: vids }));
  }
  return [{ label: FLAT_LABEL, videos }];
}

export default function VideoGrid({
  videos,
  groupBy,
}: {
  videos: VideoListItem[];
  groupBy: string;
}) {
  const pendingIds = videos
    .filter((v) => v.status === "pending" || v.status === "processing")
    .map((v) => v.id);

  const groups = groupVideos(videos, groupBy);

  return (
    <div>
      <StatusPoller ids={pendingIds} />
      {groups.map((group) => (
        <section key={group.label} className="mb-8">
          {group.label !== FLAT_LABEL && (
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {group.label}
            </h2>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
