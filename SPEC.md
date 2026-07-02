# ZnTube — Your YouTube Knowledge Base

## Problem

You watch a lot of valuable YouTube content — tutorials, how-tos, advice, tips.
Days or weeks later, most of it is forgotten. Bookmarks and "liked videos" don't
help: they store *links*, not *knowledge*. There is no system that captures what
a video actually taught you, keeps it organized, and lets you come back to it.

## Solution

A personal web app that turns videos you save into structured, searchable
knowledge:

1. **Capture** a video (paste a link; later, auto-sync from YouTube likes).
2. **Extract** — the app pulls the transcript + metadata and uses Claude to
   generate a structured recap.
3. **Organize** — videos are auto-grouped by creator, topic, and category.
4. **Retrieve** — browse the library, open a video for its full recap, add your
   own notes, and read AI-synthesized digests per topic.

What makes this more than a bookmark manager: **cross-video synthesis** — the
knowledge from all videos on a theme (e.g. "making money with Claude") merges
into one living topic digest.

## The recap (per video)

For every saved video, the app generates and stores:

- **Summary** — concise overview of what the video is about and its core message.
- **Action points** — concrete, checkable things to do.
- **Key takeaways / tips** — insights worth remembering.
- **Step-by-step guide** — if the video is a tutorial/how-to, the full procedure.
- **Content type** — tutorial, opinion, review, case study, news, etc. (auto-detected).
- **Topics & category** — consistent tags so knowledge clusters across videos.
- **Metadata** — title, creator/channel, thumbnail, duration, publish date, URL.
- **Personal notes** — your own notes alongside the AI recap (editable anytime).

## Organization & retrieval

- **Library view** — all saved videos as cards; filter/group by creator, topic,
  category, content type; text search.
- **Creator pages** — everything you've saved from a channel.
- **Topic pages** — all videos on a topic **plus a topic digest**: an AI-written
  synthesis merging the insights from every video under that topic. Digests
  refresh when new videos are added to the topic.
- Topic taxonomy is AI-assigned but **user-correctable** (rename, merge, re-tag).

## Roadmap

### V1 — Solid core
- Paste a YouTube link → fetch metadata + transcript → Claude recap.
- Library with grouping/filtering by creator, topic, category, content type.
- Video detail page: full recap + personal notes.
- Topic pages with AI topic digests.
- Single user (you), simple auth.

### V2
- **Auto-sync liked videos** (Google OAuth + YouTube Data API): like a video on
  YouTube, it appears in the app already processed.
- **Cross-library Q&A** — semantic search + "chat with your library"
  (embeddings + vector search over recaps/transcripts).

### Later / ideas parked
- Browser extension ("save to library" on the YouTube page).
- Mobile share-target (PWA).
- Spaced repetition / "did you apply this?" resurfacing of action points.

## Architecture (proposed)

- **Frontend**: Next.js (React) on Vercel — responsive web app, PWA-ready.
- **Backend/DB**: Supabase — Postgres, auth, storage; `pgvector` ready for V2 Q&A.
- **Transcript**: YouTube captions (timedtext / transcript endpoints), fallback
  strategies for videos without captions.
- **AI**: Claude API — one structured-output extraction call per video
  (summary, actions, tips, steps, type, topics), plus digest-generation calls
  per topic.

### Core data model (V1)

- `videos` — id, youtube_id, url, title, channel_id, thumbnail, duration,
  published_at, saved_at, content_type, summary, transcript, status.
- `channels` — id, youtube_channel_id, name, thumbnail.
- `recap_items` — video_id, kind (`action` | `tip` | `step`), position, text.
- `topics` — id, name, slug, digest (text), digest_updated_at.
- `video_topics` — video_id ↔ topic_id.
- `notes` — video_id, body, updated_at.

### Processing pipeline (paste-a-link)

```
URL → validate → fetch metadata (oEmbed/Data API)
    → fetch transcript
    → Claude structured extraction (recap + topics)
    → upsert channel/topics, save recap
    → mark topic digests stale → regenerate digests
```

Processing runs async with a status the UI can poll (pending → processing →
ready / failed), so pasting a link feels instant.
