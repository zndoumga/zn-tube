import { listVideos, listChannelsForFilter, listTopicsForFilter } from "@/lib/queries";
import { contentTypeValues, type ContentType } from "@/db/schema";
import AddVideoForm from "@/components/AddVideoForm";
import FilterBar from "@/components/FilterBar";
import VideoGrid from "@/components/VideoGrid";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function LibraryPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = firstString(sp.q);
  const channelId = firstString(sp.creator);
  const topicId = firstString(sp.topic);
  const contentTypeParam = firstString(sp.type);
  const contentType = contentTypeValues.includes(contentTypeParam as ContentType)
    ? (contentTypeParam as ContentType)
    : undefined;
  const groupBy = firstString(sp.group) ?? "none";

  const [videos, channelsList, topicsList] = await Promise.all([
    listVideos({ q, channelId, topicId, contentType }),
    listChannelsForFilter(),
    listTopicsForFilter(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Library</h1>
      <AddVideoForm />
      <FilterBar
        channels={channelsList}
        topics={topicsList}
        contentTypes={contentTypeValues}
      />
      {videos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white py-16 text-center text-sm text-neutral-500">
          No videos yet. Paste a YouTube link above to save your first one.
        </div>
      ) : (
        <VideoGrid videos={videos} groupBy={groupBy} />
      )}
    </main>
  );
}
