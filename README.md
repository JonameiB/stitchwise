# Stitchwise 🧶

Their pattern. Your yarn. The right stitch count.

A little web app that adapts crochet & knit patterns to the materials *you* own —
so what you make comes out the size you meant. Phase 1: **My Stash** + **Pattern Converter**.

## Run it on your computer

```bash
npm install      # once
npm run dev      # start it — opens at http://localhost:5173
```

Then open <http://localhost:5173> in your browser. Stop the server with `Ctrl+C`.

## Add your free AI key (needed for the converter)

1. Go to <https://aistudio.google.com> → **Get API key** → **Create API key** (no billing needed).
2. Open the file **`.env.local`** in this folder.
3. Paste your key after the `=` (no quotes):
   ```
   VITE_GEMINI_API_KEY=AIza...your-key...
   ```
4. Restart the dev server (`Ctrl+C`, then `npm run dev` again).

Your key stays on your machine — `.env.local` is git-ignored and never leaves your computer.

> **My Stash works without a key** — only the AI converter needs it.

## What's here

- **My Stash** — add the yarn and hooks you own. Saved privately in your browser (no account, no database).
- **Pattern Converter** — paste a pattern, pick your yarn, and get adjusted stitch counts plus the predicted finished size. Two modes: *show me the size* and *hit a target size*.

## Tech

React 19 · Vite 6 · Tailwind v4 · Google Gemini (free tier). Stash is stored in the
browser's `localStorage`.

```
src/
  App.jsx                 app shell + tabs
  index.css               design tokens (the cutesy palette) + base styles
  lib/
    gemini.js             builds the prompt, calls Gemini, parses the result
    yarnData.js           standard yarn weights + reference gauge
    useLocalStorage.js    persist state to the browser
  components/
    Stash.jsx             yarn + hooks
    Converter.jsx         the pattern converter + result card
```

## Coming next (see the plan)

Phase 2: photo upload (read patterns from screenshots), a tiny key-proxy so you can
share a public link. Phase 3: project suggestions from your stash, then paste-a-link.
