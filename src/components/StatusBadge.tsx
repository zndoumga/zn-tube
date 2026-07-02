import type { VideoStatus } from "@/db/schema";

const STYLES: Record<VideoStatus, string> = {
  pending: "bg-neutral-200 text-neutral-700",
  processing: "bg-amber-100 text-amber-800",
  ready: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const LABELS: Record<VideoStatus, string> = {
  pending: "Pending",
  processing: "Processing…",
  ready: "Ready",
  failed: "Failed",
};

export default function StatusBadge({ status }: { status: VideoStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
