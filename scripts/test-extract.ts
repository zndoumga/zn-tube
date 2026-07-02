/**
 * Standalone sanity check for the Claude recap extraction call, outside the
 * full app/pipeline. Run with:
 *
 *   npx tsx scripts/test-extract.ts <youtube-url-or-id>
 *
 * Requires ANTHROPIC_API_KEY in the environment (e.g. via `.env.local` and
 * `node --env-file=.env.local` or a tool like `dotenv-cli`).
 */
import { parseYoutubeId, fetchMetadata, fetchTranscript } from "../src/lib/youtube";
import { extractRecap } from "../src/lib/claude";

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npx tsx scripts/test-extract.ts <youtube-url-or-id>");
    process.exit(1);
  }

  const id = parseYoutubeId(input);
  if (!id) {
    console.error(`Could not parse a YouTube video ID from: ${input}`);
    process.exit(1);
  }

  console.log("Fetching metadata + transcript...");
  const metadata = await fetchMetadata(id);
  const transcript = await fetchTranscript(id);

  if (!transcript) {
    console.error("No transcript available for this video — cannot test extraction.");
    process.exit(1);
  }

  console.log(`Transcript length: ${transcript.text.length} chars`);
  console.log("Calling Claude for extraction...\n");

  const recap = await extractRecap({
    title: metadata.title,
    channelName: metadata.channelName,
    existingTopics: ["making money with Claude", "home espresso setup"],
    transcript: transcript.text,
  });

  console.log(JSON.stringify(recap, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
