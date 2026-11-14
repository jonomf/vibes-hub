// Takes a thumbnail of each project's live page and saves it to site/thumbs/.
// Projects with an "image" override in vibes.json are skipped.
// Failures are fine: the gallery falls back to a generated cover.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const file = new URL("site/projects.json", root);
const data = JSON.parse(await readFile(file, "utf8"));
await mkdir(new URL("site/thumbs/", root), { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({
  viewport: { width: 1200, height: 800 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});

for (const p of data.projects) {
  if (p.image) continue;
  const page = await context.newPage();
  try {
    const res = await page.goto(p.url, { waitUntil: "load", timeout: 30000 });
    if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
    await page.waitForTimeout(3000); // let canvases/animations settle
    const name = `thumbs/${p.id}.jpg`;
    await page.screenshot({ path: fileURLToPath(new URL(`site/${name}`, root)), type: "jpeg", quality: 72 });
    p.thumb = name;
    console.log(`  ✓ ${p.id}`);
  } catch (err) {
    console.log(`  ✗ ${p.id}: ${err.message.split("\n")[0]}`);
  } finally {
    await page.close();
  }
}

await browser.close();
await writeFile(file, JSON.stringify(data, null, 2));
