import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { refreshTopicDigest } from "@/lib/pipeline";

// Digest generation for one topic is a single Claude call over already-
// extracted recap text (not full transcripts), so it comfortably finishes
// within the default function timeout — no waitUntil needed here.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const topic = await db.query.topics.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!topic) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }

  await refreshTopicDigest(id);

  return NextResponse.json({ id, status: "ok" });
}
