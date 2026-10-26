# Mel Reads

A short daily reading game for Mel (age 6), with Sparkle the unicorn. Plain HTML and JavaScript, installed on the phone as a home-screen app. No build step.

- **Live app:** https://mel-reads.vercel.app (Vercel project `mel-reads`)
- **Cloud saves:** Supabase project `kids`, schema `melreads` (`saves` and daily `snapshots`), keyed by a family code. Saves go to the device first and sync a moment later. See `src/sync.js`.

## Files

| File | What it does |
| --- | --- |
| `src/index.html` | Page shell and all styles |
| `src/app.js` | Screens, lessons, games, progress |
| `src/content.js` | Word lists, sentences, books, lesson steps, Sparkle's lines and wardrobe |
| `src/math.js` | Count with Sparkle: single-digit addition with a spaced-review box per fact |
| `src/sparkle.js` | Sparkle drawing (SVG) |
| `src/audio.js` | Voice, sound effects, haptics, confetti |
| `src/voice/` | Sparkle's recorded voice clips (don't edit by hand, see below) |
| `src/sync.js` | Cloud save and merging between devices |
| `src/sw.js` | Offline support. Bump the cache name `V` when releasing |

## Sparkle's voice

Sparkle speaks from recorded clips made with [Kokoro](https://github.com/hexgrad/kokoro), an open neural voice (Apache-2.0), instead of the phone's robotic built-in voice. Each clip is named by a hash of its text (`clipId` in `content.js`), so there's no lookup table to keep in sync.

- Everything she can say comes from `allSpokenTexts()` in `content.js` and `mathSpokenTexts()` in `math.js`. If you add a line in `app.js`, add it there too (or to `MORE_LINES`).
- The **Sparkle's voice** GitHub Action (`.github/workflows/voice.yml`) runs on pushes to `beta` and `main` that change `content.js`, `math.js` or `tools/voice/`. It records only the new lines, removes unused clips, and commits them back to that branch. Feature branches don't record, so new lines play in the phone's voice on their previews until merged.
- A line without a clip still works: the app falls back to the built-in voice and logs `[voice] no clip for …` in the console.
- To hear other voices, open `/voice/samples.html` on the app. Change the voice with `VOICE` in the workflow and `VOICE_DIR` in `audio.js`.

## Running locally

Serve `src/` with any static server, for example `npx serve src`.

## History

This repo was imported on 2026-10-25 from the production deploy of 2026-10-13, which was v0.4. Every file matches that deploy byte for byte, except the two PNG icons. Those were re-rendered from `icon.svg` because the originals couldn't be downloaded intact.
