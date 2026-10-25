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
| `src/sparkle.js` | Sparkle drawing (SVG) |
| `src/audio.js` | Voice, sound effects, haptics, confetti |
| `src/sync.js` | Cloud save and merging between devices |
| `src/sw.js` | Offline support. Bump the cache name `V` when releasing |

## Running locally

Serve `src/` with any static server, for example `npx serve src`.

## History

This repo was imported on 2026-10-25 from the production deploy of 2026-10-13, which was v0.4. Every file matches that deploy byte for byte, except the two PNG icons. Those were re-rendered from `icon.svg` because the originals couldn't be downloaded intact.
