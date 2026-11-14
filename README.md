# ✺ vibes hub

A gallery of my vibe coded projects → **https://jonomf.github.io/vibes-hub/**

## Adding a project

**Just turn on GitHub Pages in the project's repo.** That's it.

Every public repo of mine with Pages enabled shows up here automatically. The gallery rebuilds every 6 hours, on every push to this repo, or right away if you hit **Actions → Build & deploy gallery → Run workflow**. Each card gets a live screenshot of the page.

The card uses the repo's **description** and **topics** (set them in the "About" box on the repo's GitHub page), so a good description there is all most projects need.

## Tweaking things: `vibes.json`

Edit [`vibes.json`](vibes.json) right on GitHub (pencil icon) to customize:

```jsonc
{
  "exclude": ["vibes-hub", "some-repo-i-dont-want-shown"],

  "projects": {
    "time-chess": {
      "title": "Time-Travel Chess",        // otherwise derived from the repo name
      "description": "Rewind. Branch. Win.", // otherwise the repo description
      "emoji": "♟️",                         // badge on the card
      "tags": ["game"],                      // otherwise the repo topics
      "featured": true,                      // pinned first, double width
      "image": "https://…/cover.png",        // use instead of the auto screenshot
      "url": "https://…",                    // otherwise the Pages URL
      "hidden": true                         // hide without excluding
    }
  },

  // Pages that don't come from a Pages-enabled repo of mine
  "extra": [
    { "title": "Something", "url": "https://…", "repo": "https://github.com/…", "emoji": "🌀" }
  ],

  // Only show repos with this topic (e.g. "vibe-coded"). null = show all Pages repos.
  "require_topic": null
}
```

## How it works

- `scripts/build.mjs` asks the GitHub API for my public repos with Pages enabled, merges in `vibes.json`, and writes `site/projects.json`.
- `scripts/screenshot.mjs` opens each page in headless Chromium and saves a thumbnail.
- `site/` is a static page that renders `projects.json`; the workflow deploys it to Pages.

Local preview: `npm run build && npm run serve` (screenshots: `npm i && npx playwright install chromium && npm run thumbs`).
