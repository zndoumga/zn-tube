import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { parseYoutubeId } from "@/lib/youtube";
import { processVideo } from "@/lib/pipeline";

// Give the background pipeline (metadata + transcript + Claude calls) room
// to finish inside the same invocation via waitUntil.
export const maxDuration = 300;

const bodySchema = z.object({ url: z.string().min(1) });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid 'url' field." },
      { status: 400 },
    );
  }

  const youtubeId = parseYoutubeId(parsed.data.url);
  if (!youtubeId) {
    return NextResponse.json(
      { error: "Could not parse a YouTube video ID from that URL." },
      { status: 400 },
    );
  }

  const existing = await db.query.videos.findFirst({
    where: (v, { eq }) => eq(v.youtubeId, youtubeId),
  });

  if (existing) {
    return NextResponse.json(
      { id: existing.id, status: existing.status, existed: true },
      { status: 200 },
    );
  }

  const [created] = await db
    .insert(videos)
    .values({
      youtubeId,
      url: parsed.data.url,
      status: "pending",
    })
    .returning({ id: videos.id, status: videos.status });

  waitUntil(processVideo(created.id));

  return NextResponse.json(
    { id: created.id, status: created.status, existed: false },
    { status: 202 },
  );
}
