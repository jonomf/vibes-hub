// Discovers your GitHub Pages projects and writes site/projects.json.
// Runs in GitHub Actions (uses GITHUB_TOKEN if present), or locally:
//   node scripts/build.mjs
// For offline testing: VIBES_FAKE_REPOS=path/to/repos.json node scripts/build.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const config = JSON.parse(await readFile(new URL("vibes.json", root), "utf8"));
const owner = config.owner;
const token = process.env.GITHUB_TOKEN;

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "vibes-hub",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return res.json();
}

async function listRepos() {
  if (process.env.VIBES_FAKE_REPOS) {
    return JSON.parse(await readFile(process.env.VIBES_FAKE_REPOS, "utf8"));
  }
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`/users/${owner}/repos?per_page=100&page=${page}&sort=pushed`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

// Ask GitHub for the real Pages URL (handles custom domains); fall back to the default.
async function pagesUrl(repo) {
  if (repo.homepage && /^https?:\/\//.test(repo.homepage)) return repo.homepage;
  if (!process.env.VIBES_FAKE_REPOS) {
    try {
      const pages = await gh(`/repos/${owner}/${repo.name}/pages`);
      if (pages.html_url) return pages.html_url;
    } catch {}
  }
  if (repo.name.toLowerCase() === `${owner.toLowerCase()}.github.io`) return `https://${owner}.github.io/`;
  return `https://${owner}.github.io/${repo.name}/`;
}

const titleCase = (s) =>
  s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const exclude = new Set((config.exclude || []).map((s) => s.toLowerCase()));
const overrides = config.projects || {};

const repos = (await listRepos()).filter(
  (r) =>
    r.has_pages &&
    !r.fork &&
    !r.archived &&
    !r.private &&
    !exclude.has(r.name.toLowerCase()) &&
    (!config.require_topic || (r.topics || []).includes(config.require_topic))
);

const projects = [];
for (const r of repos) {
  const o = overrides[r.name] || {};
  if (o.hidden) continue;
  projects.push({
    id: r.name,
    title: o.title || titleCase(r.name),
    description: o.description ?? r.description ?? "",
    url: o.url || (await pagesUrl(r)),
    repoUrl: r.html_url,
    topics: o.tags || (r.topics || []).filter((t) => t !== config.require_topic),
    kind: "web",
    emoji: o.emoji || null,
    image: o.image || null,
    featured: !!o.featured,
    created: r.created_at,
    updated: r.pushed_at,
  });
}

// Android apps: listed by repo name in vibes.json. Main link = latest release (the APK).
const reposByName = new Map(repos.map((r) => [r.name, r]));
for (const a of config.android || []) {
  if (!a.repo) continue;
  let r = reposByName.get(a.repo);
  if (!r && !process.env.VIBES_FAKE_REPOS) {
    try { r = await gh(`/repos/${owner}/${a.repo}`); } catch {} // private repos aren't visible; that's fine
  }
  const isPrivate = a.private ?? (!r || r.private);
  const repoUrl = `https://github.com/${owner}/${a.repo}`;
  projects.push({
    id: a.repo,
    title: a.title || titleCase(a.repo),
    description: a.description ?? r?.description ?? "",
    url: a.url || `${repoUrl}/releases/latest`,
    repoUrl: isPrivate ? null : repoUrl,
    topics: a.tags || (r?.topics || []),
    kind: "android",
    private: isPrivate,
    emoji: a.emoji || "📱",
    image: a.image || null,
    featured: !!a.featured,
    created: r?.created_at || a.date || null,
    updated: r?.pushed_at || a.date || null,
  });
}

for (const e of config.extra || []) {
  if (!e.url) continue;
  const id = e.id || e.title?.toLowerCase().replace(/\W+/g, "-") || e.url;
  projects.push({
    id,
    title: e.title || id,
    description: e.description || "",
    url: e.url,
    repoUrl: e.repo || null,
    topics: e.tags || [],
    kind: e.kind || "web",
    emoji: e.emoji || null,
    image: e.image || null,
    featured: !!e.featured,
    created: e.date || null,
    updated: e.date || null,
  });
}

projects.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));

await mkdir(new URL("site/", root), { recursive: true });
await writeFile(
  new URL("site/projects.json", root),
  JSON.stringify(
    { title: config.title, tagline: config.tagline, owner, generated: new Date().toISOString(), projects },
    null,
    2
  )
);
console.log(`Found ${projects.length} project(s):`);
for (const p of projects) console.log(`  • ${p.title} → ${p.url}`);
