/**
 * Standalone sanity check for the YouTube metadata + transcript fetch,
 * outside the full app/pipeline. Run with:
 *
 *   npx tsx scripts/test-transcript.ts <youtube-url-or-id>
 */
import { parseYoutubeId, fetchMetadata, fetchTranscript } from "../src/lib/youtube";

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npx tsx scripts/test-transcript.ts <youtube-url-or-id>");
    process.exit(1);
  }

  const id = parseYoutubeId(input);
  if (!id) {
    console.error(`Could not parse a YouTube video ID from: ${input}`);
    process.exit(1);
  }
  console.log(`Video ID: ${id}`);

  console.log("\n--- Metadata ---");
  const metadata = await fetchMetadata(id);
  console.log(metadata);

  console.log("\n--- Transcript ---");
  const transcript = await fetchTranscript(id);
  if (!transcript) {
    console.log("No transcript available.");
  } else {
    console.log(`Source: ${transcript.source}`);
    console.log(`Length: ${transcript.text.length} chars`);
    console.log(`Preview: ${transcript.text.slice(0, 300)}...`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
