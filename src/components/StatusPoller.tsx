"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the current server-rendered page every few seconds while any
 * of the given video ids are still pending/processing. Once the pipeline
 * finishes, the next server render no longer includes those ids and this
 * component naturally stops polling (it unmounts/re-mounts with an empty
 * `ids` array).
 */
export default function StatusPoller({ ids }: { ids: string[] }) {
  const router = useRouter();
  const key = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
