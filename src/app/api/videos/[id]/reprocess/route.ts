import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { processVideo } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const video = await db.query.videos.findFirst({
    where: (v, { eq: eqFn }) => eqFn(v.id, id),
  });
  if (!video) {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }

  await db
    .update(videos)
    .set({ status: "pending", error: null })
    .where(eq(videos.id, id));

  waitUntil(processVideo(id));

  return NextResponse.json({ id, status: "pending" }, { status: 202 });
}
