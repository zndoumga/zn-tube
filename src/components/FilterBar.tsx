"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, FormEvent } from "react";

interface FilterBarProps {
  channels: { id: string; name: string }[];
  topics: { id: string; name: string }[];
  contentTypes: readonly string[];
}

export default function FilterBar({
  channels,
  topics,
  contentTypes,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    updateParam("q", q);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <form onSubmit={handleSearchSubmit} className="min-w-[200px] flex-1">
        <input
          type="search"
          placeholder="Search titles…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
        />
      </form>

      <select
        defaultValue={searchParams.get("creator") ?? ""}
        onChange={(e) => updateParam("creator", e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="">All creators</option>
        {channels.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("topic") ?? ""}
        onChange={(e) => updateParam("topic", e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="">All topics</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("type") ?? ""}
        onChange={(e) => updateParam("type", e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="">All types</option>
        {contentTypes.map((t) => (
          <option key={t} value={t}>
            {t.replace("_", " ")}
          </option>
        ))}
      </select>

      <select
        defaultValue={searchParams.get("group") ?? "none"}
        onChange={(e) => updateParam("group", e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="none">No grouping</option>
        <option value="creator">Group by creator</option>
        <option value="topic">Group by topic</option>
        <option value="type">Group by type</option>
      </select>
    </div>
  );
}
