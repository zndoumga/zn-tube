# ZnTube

A personal YouTube knowledge base. Paste a video link, get an AI-generated
recap (summary, action points, tips, step-by-step guide), and browse your
saved videos by creator, topic, and content type. Topics get a living
"digest" that synthesizes knowledge across every video you've saved on that
theme. See `SPEC.md` for the full product spec.

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- Neon Postgres + Drizzle ORM
- Claude API (`claude-opus-4-8`) for recap extraction and topic digests
- youtubei.js for metadata + transcripts, with an oEmbed fallback

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Neon Postgres database.** Either via the
   [Vercel Marketplace Neon integration](https://vercel.com/marketplace/neon)
   (if you're going to deploy to Vercel) or directly at
   [console.neon.tech](https://console.neon.tech). Grab the connection
   string.

3. **Get an Anthropic API key** from the
   [Anthropic Console](https://console.anthropic.com/).

4. **Copy `.env.example` to `.env.local`** and fill in all four values:

   ```bash
   cp .env.example .env.local
   ```

   - `DATABASE_URL` — the Neon connection string from step 2.
   - `ANTHROPIC_API_KEY` — from step 3.
   - `APP_PASSWORD` — whatever password you want to log in with.
   - `AUTH_SECRET` — a random secret used to sign the session cookie.
     Generate one with `openssl rand -hex 32`.

5. **Run the database migration:**

   ```bash
   npm run db:migrate
   ```

6. **Start the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), log in with your
   `APP_PASSWORD`, and paste a YouTube link.

## Scripts

| Command              | What it does                                              |
| --------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Start the dev server                                       |
| `npm run build`        | Production build                                            |
| `npm run db:generate`  | Generate a new migration from `src/db/schema.ts`             |
| `npm run db:migrate`   | Apply pending migrations to `DATABASE_URL`                  |
| `npm run db:studio`    | Open Drizzle Studio to browse the database                  |

For debugging the two integrations that talk to the outside world, outside
of the full app:

```bash
npx tsx scripts/test-transcript.ts <youtube-url-or-id>   # metadata + transcript fetch only
npx tsx scripts/test-extract.ts <youtube-url-or-id>      # + Claude recap extraction (needs ANTHROPIC_API_KEY)
```

## How it works

Pasting a link inserts a `pending` row and kicks off background processing
(`src/lib/pipeline.ts`) via `waitUntil`, so the request returns immediately
and the UI polls for status. The pipeline: fetches metadata and the
transcript, sends the transcript to Claude for structured extraction
(summary/action points/tips/steps/content type/topics — see
`src/lib/claude.ts`), resolves topic tags against existing topics (reusing
names verbatim when they fit), and regenerates the digest for any topic
touched by the video.

If a video has no captions available, it's saved with metadata only and
flagged accordingly — no Whisper fallback in V1 (see `SPEC.md` → Roadmap).

## Deploying

Not done yet for this app, but it's built to be Vercel-ready: set the four
env vars in the Vercel project, connect the Neon database, and deploy. The
one thing to verify after deploying is that YouTube metadata/transcript
fetching works from Vercel's egress IPs — see the note in `SPEC.md`.
