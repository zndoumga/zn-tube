import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const video = await db.query.videos.findFirst({
    where: (v, { eq }) => eq(v.id, id),
    columns: { status: true, error: true, transcriptSource: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }

  return NextResponse.json(video);
}
