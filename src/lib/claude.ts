import Anthropic from "@anthropic-ai/sdk";
import type { ContentType } from "@/db/schema";
import { contentTypeValues } from "@/db/schema";

const MODEL = "claude-opus-4-8";

// Keep the transcript well within context limits and bound latency/cost for
// a single extraction call. Captions for even very long videos rarely
// exceed this after whitespace normalization.
const MAX_TRANSCRIPT_CHARS = 180_000;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export interface RecapResult {
  summary: string;
  contentType: ContentType;
  actionPoints: string[];
  tips: string[];
  steps: string[];
  topics: string[];
}

const RECAP_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "A 2-4 paragraph overview of the video's core message and what it covers.",
    },
    content_type: {
      type: "string",
      enum: contentTypeValues,
      description: "The kind of video this is.",
    },
    action_points: {
      type: "array",
      items: { type: "string" },
      description:
        "Concrete, checkable things the viewer could do as a result of watching. Empty array if none apply.",
    },
    tips: {
      type: "array",
      items: { type: "string" },
      description:
        "Standalone insights, tips, or things worth remembering. Empty array if none apply.",
    },
    steps: {
      type: "array",
      items: { type: "string" },
      description:
        "An ordered step-by-step how-to, only if the video is a tutorial. Empty array otherwise.",
    },
    topics: {
      type: "array",
      items: { type: "string" },
      description:
        "1-4 short, reusable theme tags (2-4 words each) that this video belongs to, e.g. 'making money with Claude'. Prefer reusing an existing topic name verbatim over inventing a near-duplicate.",
    },
  },
  required: [
    "summary",
    "content_type",
    "action_points",
    "tips",
    "steps",
    "topics",
  ],
  additionalProperties: false,
} as const;

const EXTRACTION_SYSTEM_PROMPT = `You extract structured knowledge recaps from YouTube video transcripts for a personal knowledge base app. The user saves videos they found valuable and wants to be able to come back later and instantly recall what mattered, without rewatching.

Rules:
- action_points are concrete and checkable ("Set up a Notion database with these 4 columns"), not vague ("be more organized").
- tips are standalone insights or advice worth remembering, distinct from action_points (a tip can be a fact or framing, not necessarily an action).
- steps is an ordered how-to guide, and should ONLY be populated if the video is a tutorial or otherwise walks through a concrete procedure. Leave it empty for opinion pieces, reviews, news, talks, etc.
- topics are short, reusable theme tags (2-4 words), phrased the way someone would search for the theme later (e.g. "making money with Claude", "home espresso setup"). You will be given the list of topics already in the user's library — reuse an existing name verbatim whenever the video reasonably fits it. Only invent a new topic when none of the existing ones fit.
- Base everything strictly on the transcript content. Do not invent details not present in the video.`;

function buildExtractionUserPrompt(
  title: string | null,
  channelName: string | null,
  existingTopics: string[],
  transcript: string,
): string {
  const truncated =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? transcript.slice(0, MAX_TRANSCRIPT_CHARS) + "\n[transcript truncated]"
      : transcript;

  const topicsList =
    existingTopics.length > 0
      ? existingTopics.map((t) => `- ${t}`).join("\n")
      : "(none yet — this is the first video)";

  return `Video title: ${title ?? "(unknown)"}
Channel: ${channelName ?? "(unknown)"}

Existing topics in the library:
${topicsList}

Transcript:
${truncated}`;
}

export class RecapExtractionError extends Error {}

export async function extractRecap(params: {
  title: string | null;
  channelName: string | null;
  existingTopics: string[];
  transcript: string;
}): Promise<RecapResult> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildExtractionUserPrompt(
          params.title,
          params.channelName,
          params.existingTopics,
          params.transcript,
        ),
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: RECAP_SCHEMA },
    },
  });

  if (response.stop_reason === "refusal") {
    throw new RecapExtractionError(
      "Claude declined to process this video (safety refusal).",
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new RecapExtractionError(
      "Claude's response was truncated (hit max_tokens) before finishing the recap.",
    );
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  if (!textBlock) {
    throw new RecapExtractionError(
      "Claude's response did not contain the expected structured output.",
    );
  }

  let parsed: {
    summary: string;
    content_type: ContentType;
    action_points: string[];
    tips: string[];
    steps: string[];
    topics: string[];
  };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new RecapExtractionError(
      "Failed to parse Claude's structured output as JSON.",
    );
  }

  return {
    summary: parsed.summary,
    contentType: parsed.content_type,
    actionPoints: parsed.action_points,
    tips: parsed.tips,
    steps: parsed.steps,
    topics: parsed.topics,
  };
}

export interface DigestVideoInput {
  title: string | null;
  channelName: string | null;
  summary: string | null;
  tips: string[];
  actionPoints: string[];
}

const DIGEST_SYSTEM_PROMPT = `You write a living "topic digest" that synthesizes everything the user has learned about a topic across the YouTube videos they've saved on it. This is not a per-video recap — it's a merged, organized synthesis.

Rules:
- Merge overlapping advice from different videos instead of repeating it per-video.
- If creators disagree, note the disagreement explicitly rather than picking a side silently.
- Organize by theme/sub-topic, not by video.
- Keep it actionable — prioritize action points and concrete tips over abstract summary.
- Write in markdown (headings, bullet lists) since this will be rendered directly.
- Do not just concatenate the inputs — actually synthesize them.`;

function buildDigestUserPrompt(
  topicName: string,
  videos: DigestVideoInput[],
): string {
  const videoBlocks = videos
    .map((v, i) => {
      const tips = v.tips.length > 0 ? v.tips.map((t) => `  - ${t}`).join("\n") : "  (none)";
      const actions =
        v.actionPoints.length > 0
          ? v.actionPoints.map((a) => `  - ${a}`).join("\n")
          : "  (none)";
      return `Video ${i + 1}: "${v.title ?? "(untitled)"}" by ${
        v.channelName ?? "(unknown creator)"
      }
Summary: ${v.summary ?? "(none)"}
Tips:
${tips}
Action points:
${actions}`;
    })
    .join("\n\n");

  return `Topic: ${topicName}

Videos saved on this topic:

${videoBlocks}`;
}

export async function generateTopicDigest(
  topicName: string,
  videos: DigestVideoInput[],
): Promise<string> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: DIGEST_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildDigestUserPrompt(topicName, videos) },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new RecapExtractionError(
      "Claude declined to generate a digest for this topic (safety refusal).",
    );
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  if (!textBlock) {
    throw new RecapExtractionError(
      "Claude's digest response did not contain any text.",
    );
  }

  return textBlock.text;
}
