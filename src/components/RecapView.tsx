import type { VideoDetail } from "@/lib/queries";

function Section({
  title,
  items,
  checkable,
}: {
  title: string;
  items: string[];
  checkable?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-neutral-800">
            {checkable ? (
              <input
                type="checkbox"
                className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-neutral-300"
              />
            ) : (
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RecapView({ video }: { video: VideoDetail }) {
  if (video.transcriptSource === "none") {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
        No transcript is available for this video (captions may be disabled),
        so a recap could not be generated. The video is still saved with its
        metadata.
      </div>
    );
  }

  if (video.status === "pending" || video.status === "processing") {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
        Generating recap…
      </div>
    );
  }

  if (video.status === "failed") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-medium">Processing failed.</p>
        {video.error && <p className="mt-1">{video.error}</p>}
      </div>
    );
  }

  if (!video.summary) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
        No recap available yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Summary
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-800">
          {video.summary}
        </p>
      </div>
      <Section title="Steps" items={video.steps} />
      <Section title="Action points" items={video.actionPoints} checkable />
      <Section title="Tips" items={video.tips} />
    </div>
  );
}
