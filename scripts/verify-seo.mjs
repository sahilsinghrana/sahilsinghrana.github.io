/**
 * Post-build SEO sanity checks (run after `astro build`).
 * Usage: node scripts/verify-seo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { SITE_ORIGIN } from "./site.mjs";

const dist = path.resolve("dist");
const failures = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function read(rel) {
  return fs.readFileSync(path.join(dist, rel), "utf8");
}

assert(fs.existsSync(path.join(dist, "sitemap-index.xml")), "sitemap-index.xml missing");
assert(fs.existsSync(path.join(dist, "sitemap-0.xml")), "sitemap-0.xml missing");
assert(fs.existsSync(path.join(dist, "rss.xml")), "rss.xml missing");
assert(fs.existsSync(path.join(dist, "robots.txt")), "robots.txt missing");

const robots = read("robots.txt");
assert(
  robots.includes(`${SITE_ORIGIN}/sitemap-index.xml`),
  "robots sitemap host",
);

const sitemap = read("sitemap-0.xml");
assert(sitemap.includes("/blog/posts/chain-javascript-methods"), "live blog slug in sitemap");
assert(!sitemap.includes("/blog/posts/method-chaining-js"), "folder id must not be public slug");
assert(sitemap.includes("/tools/curlRequestGenerator"), "curl tool in sitemap");

const index = read("index.html");
assert(
  index.includes(`content=${SITE_ORIGIN}/appSS.webp`) ||
    index.includes(`content="${SITE_ORIGIN}/appSS.webp"`),
  "absolute og:image on home",
);
assert(
  index.includes(`href=${SITE_ORIGIN}/ rel=canonical`) ||
    index.includes(`href="${SITE_ORIGIN}/" rel="canonical"`) ||
    index.includes("rel=canonical"),
  "canonical on home",
);
assert(index.includes("/rss.xml"), "rss alternate link");

const notFound = read("404.html");
assert(notFound.includes("noindex"), "404 should be noindex");

const curl = read("tools/curlRequestGenerator.html");
assert(curl.includes("/tools/curlRequestGenerator"), "curl canonical/schema path");
assert(!curl.includes("curl-generator"), "old curl schema path removed");
assert(!curl.includes("Postman/Fetch"), "honest feature list");

const post = read("blog/posts/chain-javascript-methods.html");
assert(post.includes("content=article") || post.includes("property=og:type"), "article og type");
assert(post.includes("BlogPosting"), "BlogPosting schema");
assert(post.includes("<h1>"), "post title H1");
assert(
  post.includes("datetime=") && /datetime=["']?\d{4}-\d{2}-\d{2}T/.test(post),
  "post time datetime is ISO 8601",
);

const rss = read("rss.xml");
assert(rss.includes("chain-javascript-methods"), "rss includes live slug");
assert(!rss.includes("chain-javascript-methods/"), "rss should not use trailing slash");

// Static meta-refresh redirect pages for renamed blog URLs (GitHub Pages).
const redirectChecks = [
  {
    file: "blog/posts/method-chaining-js.html",
    dest: "chain-javascript-methods",
  },
  {
    file: "blog/posts/howto/linked-list-with-generators.html",
    dest: "linked-list-with-generators",
  },
  {
    file: "blog/posts/howto/convert-string-to-literal.html",
    dest: "convert-string-to-literal",
  },
];

for (const { file, dest } of redirectChecks) {
  const full = path.join(dist, file);
  assert(fs.existsSync(full), `redirect page missing: ${file}`);
  if (fs.existsSync(full)) {
    const html = read(file);
    assert(
      html.includes(dest) &&
        (html.includes("http-equiv") ||
          html.includes("refresh") ||
          html.includes("location.href") ||
          html.includes(`href=/${dest}`) ||
          html.includes(`href="/blog/posts/${dest}`)),
      `redirect ${file} should point to ${dest}`,
    );
  }
}

if (failures.length) {
  console.error("SEO verify failed:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  "SEO verify passed (" +
    [
      "sitemap",
      "robots",
      "rss",
      "canonical/og",
      "404 noindex",
      "curl schema",
      "blog slug/H1",
      "static redirects",
    ].join(", ") +
    ").",
);
console.log(
  `After deploy: resubmit ${SITE_ORIGIN}/sitemap-index.xml in Google Search Console and inspect /tools/curlRequestGenerator plus 2–3 blog URLs.`,
);
