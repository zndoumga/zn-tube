import Link from "next/link";
import { listTopicsIndex } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TopicsIndexPage() {
  const topics = await listTopicsIndex();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Topics</h1>

      {topics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white py-16 text-center text-sm text-neutral-500">
          No topics yet — they&apos;re created automatically as you save
          videos.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                href={`/topics/${t.slug}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-neutral-50"
              >
                <span className="text-sm font-medium text-neutral-900">
                  {t.name}
                </span>
                <span className="flex items-center gap-2 text-xs text-neutral-500">
                  {t.digestStale && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                      Updating…
                    </span>
                  )}
                  {t.videoCount} video{t.videoCount === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
