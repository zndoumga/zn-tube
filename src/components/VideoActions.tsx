"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteVideo } from "@/app/actions";
import type { VideoStatus } from "@/db/schema";

export default function VideoActions({
  videoId,
  status,
}: {
  videoId: string;
  status: VideoStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleReprocess() {
    setBusy(true);
    try {
      await fetch(`/api/videos/${videoId}/reprocess`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm("Delete this video and its recap? This cannot be undone.")
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteVideo(videoId);
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      {(status === "failed" || status === "ready") && (
        <button
          onClick={handleReprocess}
          disabled={busy}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reprocess
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={busy}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
