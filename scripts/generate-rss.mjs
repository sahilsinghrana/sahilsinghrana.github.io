/**
 * Build-time RSS generator for static hosting (writes public/rss.xml).
 * Run before `astro build` so the file is copied into dist.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SITE_ORIGIN } from "./site.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const site = SITE_ORIGIN;
const outFile = path.join(root, "public", "rss.xml");

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdown(full));
    } else if (entry.name === "index.md" || entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return data;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date("2024-01-01");
  if (Number.isNaN(date.valueOf())) return new Date("2024-01-01").toUTCString();
  return date.toUTCString();
}

function folderSlug(filePath, baseDir) {
  const rel = path.relative(baseDir, filePath).replace(/\\/g, "/");
  return rel.replace(/\/index\.md$/i, "").replace(/\.md$/i, "");
}

function loadItems(baseDir, urlPrefix) {
  return walkMarkdown(baseDir).map((file) => {
    const data = parseFrontmatter(fs.readFileSync(file, "utf8"));
    const slug = data.slug || folderSlug(file, baseDir);
    return {
      title: data.title || slug,
      description: data.description || "",
      pubDate: data.pubDate || "2024-01-01",
      link: `${urlPrefix}/${slug}`,
    };
  });
}

const posts = loadItems(path.join(root, "src/content/blog"), "/blog/posts");
const snippets = loadItems(
  path.join(root, "src/content/snippets"),
  "/blog/snippets",
);

const items = [...posts, ...snippets].sort(
  (a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf(),
);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sahil Rana Blog</title>
    <description>JavaScript articles and code snippets by Sahil Rana - patterns, tooling tips, and web development notes.</description>
    <link>${site}/</link>
    <language>en-us</language>
${items
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${site}${item.link}</link>
      <guid isPermaLink="true">${site}${item.link}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${toRfc822(item.pubDate)}</pubDate>
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, xml, "utf8");
console.log(`Wrote ${items.length} RSS items to public/rss.xml`);
