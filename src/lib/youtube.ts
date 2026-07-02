import { Innertube } from "youtubei.js";

export interface VideoMetadata {
  title: string | null;
  thumbnail: string | null;
  durationSeconds: number | null;
  publishedAt: Date | null;
  channelYoutubeId: string | null;
  channelName: string | null;
  channelThumbnail: string | null;
}

export interface TranscriptResult {
  text: string;
  source: "captions";
}

let innertubeSingleton: Promise<Innertube> | null = null;

function getInnertube(): Promise<Innertube> {
  if (!innertubeSingleton) {
    innertubeSingleton = Innertube.create({ generate_session_locally: true });
  }
  return innertubeSingleton;
}

/**
 * Accepts a full YouTube URL (watch, youtu.be, shorts, embed) or a bare
 * 11-character video ID and returns the video ID, or null if unparseable.
 */
export function parseYoutubeId(input: string): string | null {
  const trimmed = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    const shortsMatch = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    const embedMatch = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    const liveMatch = url.pathname.match(/^\/live\/([a-zA-Z0-9_-]{11})/);
    if (liveMatch) return liveMatch[1];
  }

  return null;
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

async function fetchOEmbedFallback(
  youtubeId: string,
): Promise<VideoMetadata> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${youtubeId}`,
  )}&format=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`oEmbed fallback failed with status ${res.status}`);
  }
  const data = (await res.json()) as OEmbedResponse;

  return {
    title: data.title ?? null,
    thumbnail: data.thumbnail_url ?? null,
    durationSeconds: null,
    publishedAt: null,
    channelYoutubeId: null,
    channelName: data.author_name ?? null,
    channelThumbnail: null,
  };
}

/**
 * Fetches video metadata via youtubei.js (Innertube), which has more fields
 * than oEmbed (duration, channel id, publish date). Falls back to oEmbed
 * (title/author/thumbnail only, no API key needed, very reliable) if
 * Innertube fails for any reason.
 */
export async function fetchMetadata(youtubeId: string): Promise<VideoMetadata> {
  try {
    const yt = await getInnertube();
    const info = await yt.getBasicInfo(youtubeId);
    const basicInfo = info.basic_info;

    const thumbnail =
      basicInfo.thumbnail && basicInfo.thumbnail.length > 0
        ? basicInfo.thumbnail[basicInfo.thumbnail.length - 1].url
        : null;

    return {
      title: basicInfo.title ?? null,
      thumbnail,
      durationSeconds: basicInfo.duration ?? null,
      publishedAt: basicInfo.start_timestamp ?? null,
      channelYoutubeId: basicInfo.channel?.id ?? basicInfo.channel_id ?? null,
      channelName: basicInfo.channel?.name ?? basicInfo.author ?? null,
      channelThumbnail: null,
    };
  } catch (err) {
    console.error(
      `[youtube] Innertube metadata fetch failed for ${youtubeId}, falling back to oEmbed:`,
      err,
    );
    return fetchOEmbedFallback(youtubeId);
  }
}

/**
 * Fetches the video transcript (manual or auto-generated captions) via
 * youtubei.js. Returns null if no transcript is available (captions
 * disabled, or the video has none) rather than throwing, since that's an
 * expected outcome the pipeline needs to handle gracefully.
 */
export async function fetchTranscript(
  youtubeId: string,
): Promise<TranscriptResult | null> {
  try {
    const yt = await getInnertube();
    const info = await yt.getBasicInfo(youtubeId);
    const transcriptInfo = await info.getTranscript();

    const segments =
      transcriptInfo?.transcript?.content?.body?.initial_segments ?? [];

    const text = segments
      .map((segment) => {
        // Segment shape varies slightly by youtubei.js version; snippet.text
        // is the common case for TranscriptSegment.
        const snippet = (segment as { snippet?: { text?: string } }).snippet;
        return snippet?.text ?? "";
      })
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return null;

    return { text, source: "captions" };
  } catch (err) {
    console.warn(`[youtube] No transcript available for ${youtubeId}:`, err);
    return null;
  }
}
