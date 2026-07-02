"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameTopic, mergeTopics } from "@/app/actions";

export default function TopicControls({
  topicId,
  currentName,
  otherTopics,
}: {
  topicId: string;
  currentName: string;
  otherTopics: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");

  async function handleRegenerate() {
    setBusy(true);
    try {
      await fetch(`/api/topics/${topicId}/regenerate`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRename() {
    setBusy(true);
    setError(null);
    try {
      const result = await renameTopic(topicId, name);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setRenaming(false);
      router.push(`/topics/${result.slug}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleMerge() {
    if (!mergeTarget) return;
    if (
      !confirm(
        "Merge this topic into the selected one? This topic will be removed and its videos re-tagged.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await mergeTopics(topicId, mergeTarget);
      router.push("/topics");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={handleRegenerate}
          disabled={busy}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Regenerate digest
        </button>

        {renaming ? (
          <div className="flex items-center gap-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
            <button
              onClick={handleRename}
              disabled={busy}
              className="rounded-md bg-neutral-900 px-2 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setRenaming(false);
                setName(currentName);
                setError(null);
              }}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setRenaming(true)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-100"
          >
            Rename
          </button>
        )}

        {otherTopics.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="">Merge into…</option>
              {otherTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {mergeTarget && (
              <button
                onClick={handleMerge}
                disabled={busy}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Merge
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
