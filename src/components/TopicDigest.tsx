import ReactMarkdown from "react-markdown";

export default function TopicDigest({ digest }: { digest: string | null }) {
  if (!digest) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
        No digest yet — it will be generated once this topic has videos.
      </div>
    );
  }

  return (
    <div className="prose prose-sm prose-neutral max-w-none rounded-lg border border-neutral-200 bg-white p-6">
      <ReactMarkdown>{digest}</ReactMarkdown>
    </div>
  );
}
