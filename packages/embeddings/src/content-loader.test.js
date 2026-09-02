import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { ContentLoader } from "./content-loader.js";
import {
  chunkDocuments,
  createBlogChunker,
  createHtmlChunker,
  createTypeAwareChunker,
} from "./chunker.js";
import { PineconeIndexer } from "./pinecone-client.js";
import { EmbeddingsPipeline } from "./service.js";

test("ContentLoader adds summary and richer metadata context for retrieval", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "embeddings-"));
  const blogDir = path.join(rootDir, "src/content/blog");

  await fs.mkdir(blogDir, { recursive: true });
  await fs.writeFile(
    path.join(blogDir, "example.md"),
    `---
title: "My article"
description: "A quick summary"
tags: [astro, performance]
pubDate: 2024-01-01
---

# Intro

This article explains how I improved page loading time and document retrieval quality.

## Performance

The site became faster by cutting JS and caching content.
`,
  );

  const loader = new ContentLoader({
    contentSections: [{ collection: "blog", baseDir: "src/content/blog" }],
    rootDir,
    maxEmbeddingChars: 4000,
  });

  const docs = await loader.loadDocuments();

  assert.equal(docs.length, 1);
  assert.match(docs[0].text, /Title: My article/);
  assert.match(docs[0].text, /Summary:/);
  assert.ok(docs[0].metadata.summary.length > 0);
  assert.deepEqual(docs[0].metadata.tags, ["astro", "performance"]);
  assert.equal(docs[0].metadata.type, "blog");
  assert.equal(docs[0].metadata.source, "/blog/posts/example");
  assert.equal(
    docs[0].metadata.url,
    "https://www.sahilrana.in/blog/posts/example",
  );
});

test("chunkDocuments preserves section headings for better retrieval context", () => {
  const docs = [
    {
      content:
        "# Intro\n\nThis article explains how I improved page loading time and document retrieval quality. It covers caching, reducing JavaScript, and keeping metadata useful for future retrieval.\n\n## Performance\n\nThe site became faster by cutting JS and caching content. The article explains how bigger sections are split into smaller, easier-to-retrieve blocks so similarity search stays relevant and user-facing answers remain concise.\n\n## Lessons\n\nThe team also learned that metadata matters as much as body text when designing retrieval. A tag list, a summary, and section headings make the index far easier to query accurately.",
      metadata: {
        collection: "blog",
        slug: "example",
        title: "Example",
        url: "/blog/posts/example",
      },
    },
  ];

  const chunks = chunkDocuments(
    docs,
    createBlogChunker({ chunkSize: 180, chunkOverlap: 20 }),
    { preserveLeadContent: false },
  );

  assert.ok(chunks.length > 1);
  assert.ok(
    chunks.some(
      (chunk) =>
        chunk.metadata.sectionHeading &&
        chunk.metadata.sectionHeading.includes("Performance"),
    ),
  );
});

test("chunkDocuments keeps heading plus paragraph together for Astro sections", () => {
  const docs = [
    {
      content:
        "# Welcome\n\nIntro paragraph that explains the page.\n\n## Performance\n\nFast page loads matter for production sites.\n\n## Notes\n\nThis section is short.",
      metadata: {
        collection: "blog",
        slug: "astro-section",
        title: "Astro Section",
        url: "/blog/posts/astro-section",
      },
    },
  ];

  const chunks = chunkDocuments(
    docs,
    createBlogChunker({ chunkSize: 180, chunkOverlap: 20 }),
    { preserveLeadContent: false },
  );

  const performanceChunk = chunks.find((chunk) =>
    chunk.content.includes("## Performance"),
  );

  assert.ok(performanceChunk);
  assert.match(
    performanceChunk.content,
    /## Performance[\s\S]*Fast page loads matter/,
  );
});

test("createTypeAwareChunker picks the appropriate strategy for blog and homepage content", () => {
  const typeAwareChunker = createTypeAwareChunker({
    blogChunker: createBlogChunker({ chunkSize: 160, chunkOverlap: 20 }),
    htmlChunker: createHtmlChunker({ chunkSize: 160, chunkOverlap: 20 }),
  });

  const blogChunks = typeAwareChunker.splitText(
    "# Intro\n\nPlain language summary.\n\n## Performance\n\nFast pages win.",
    { collection: "blog", type: "blog", slug: "type-aware" },
  );

  assert.ok(blogChunks.some((chunk) => chunk.includes("## Performance")));

  const homepageChunks = typeAwareChunker.splitText(
    "<h1>Home</h1><p>Intro text.</p><h2>Projects</h2><p>We build products.</p>",
    { isHomepage: true, slug: "index", url: "/" },
  );

  assert.ok(homepageChunks.length > 0);
  assert.ok(
    homepageChunks.some(
      (chunk) => chunk.includes("Home") || chunk.includes("Projects"),
    ),
  );
});

test("canonical metadata includes normalized type, tags, and a deterministic hash", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "embeddings-"));
  const blogDir = path.join(rootDir, "src/content/blog");

  await fs.mkdir(blogDir, { recursive: true });
  await fs.writeFile(
    path.join(blogDir, "schema-test.md"),
    `---
title: "Schema Test"
description: "Some test content"
tags: [AI, Retrieval, Search]
---

# Retrieval

This page covers retrieval quality and metadata filtering.
`,
  );

  const loader = new ContentLoader({
    contentSections: [{ collection: "blog", baseDir: "src/content/blog" }],
    rootDir,
    maxEmbeddingChars: 4000,
  });

  const docs = await loader.loadDocuments();
  const metadata = docs[0].metadata;

  assert.equal(metadata.type, "blog");
  assert.deepEqual(metadata.tags, ["ai", "retrieval", "search"]);
  assert.equal(metadata.source, "/blog/posts/schema-test");
  assert.equal(metadata.url, "https://www.sahilrana.in/blog/posts/schema-test");
  assert.ok(metadata.hash && metadata.hash.length >= 16);
});

test("ContentLoader maps snippet slugs to /blog/snippets URLs", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "embeddings-"));
  const snippetsDir = path.join(rootDir, "src/content/snippets");

  await fs.mkdir(snippetsDir, { recursive: true });
  await fs.writeFile(
    path.join(snippetsDir, "quick-tip.md"),
    `---
title: "Quick Tip"
description: "A short snippet"
---

# Tip

Useful snippet content.
`,
  );

  const loader = new ContentLoader({
    contentSections: [
      { collection: "snippets", baseDir: "src/content/snippets" },
    ],
    rootDir,
    maxEmbeddingChars: 4000,
  });

  const docs = await loader.loadDocuments();
  assert.equal(docs[0].metadata.source, "/blog/snippets/quick-tip");
  assert.equal(
    docs[0].metadata.url,
    "https://www.sahilrana.in/blog/snippets/quick-tip",
  );
});

test("PineconeIndexer queries with metadata filters and score thresholding", async () => {
  const indexer = new PineconeIndexer({
    apiKey: "test-key",
    indexName: "site-index",
    namespace: "site-v1",
    embeddingDimension: 2048,
  });

  const calls = [];
  indexer._index = {
    async query(payload) {
      calls.push(payload);
      return {
        matches: [
          { id: "a", score: 0.91 },
          { id: "b", score: 0.42 },
        ],
      };
    },
  };

  const result = await indexer.query({
    vector: new Array(2048).fill(0.1),
    topK: 5,
    filter: {
      type: "blog",
      tags: ["ai", "retrieval"],
    },
    scoreThreshold: 0.8,
  });

  assert.equal(calls[0].filter.type, "blog");
  assert.deepEqual(calls[0].filter.tags, { $in: ["ai", "retrieval"] });
  assert.equal(calls[0].topK, 5);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "a");
});

test("EmbeddingsPipeline fails clearly when OpenRouter is rate limited", async () => {
  const embedder = {
    async embedTexts() {
      const error = new Error("Rate limit exceeded: free-models-per-day");
      error.statusCode = 429;
      throw error;
    },
  };

  const indexer = new PineconeIndexer({
    apiKey: "test-key",
    indexName: "site-index",
    namespace: "site-v1",
    embeddingDimension: 2048,
  });

  const pipeline = new EmbeddingsPipeline({
    contentLoaders: [
      {
        async loadDocuments() {
          return [
            {
              id: "doc-1",
              text: "Example content",
              metadata: {
                type: "blog",
                source: "/blog/hello",
                url: "https://www.sahilrana.in/blog/hello",
                title: "Hello",
                tags: ["blog"],
                hash: "abc123",
              },
            },
          ];
        },
      },
    ],
    embedder,
    indexer,
    batchSize: 10,
    chunkingOptions: { enabled: false },
  });

  await assert.rejects(
    async () => pipeline.generate(),
    /Rate limit exceeded|free-models-per-day/i,
  );
});
