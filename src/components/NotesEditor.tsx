"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { saveNote } from "@/app/actions";

export default function NotesEditor({
  videoId,
  initialBody,
}: {
  videoId: string;
  initialBody: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending debounce timer on unmount only.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setBody(value);
    setStatus("saving");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveNote(videoId, value).then(() => setStatus("saved"));
    }, 800);
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          My notes
        </h2>
        {status === "saving" && (
          <span className="text-xs text-neutral-400">Saving…</span>
        )}
        {status === "saved" && (
          <span className="text-xs text-neutral-400">Saved</span>
        )}
      </div>
      <textarea
        value={body}
        onChange={handleChange}
        rows={6}
        placeholder="Jot down your own thoughts on this video…"
        className="w-full resize-y rounded-md border border-neutral-300 p-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
    </div>
  );
}
