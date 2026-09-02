import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import fg from "fast-glob";
import matter from "gray-matter";
import removeMarkdown from "remove-markdown";
import { SITE_ORIGIN } from "../../../scripts/site.mjs";
import {
  createBlogChunker,
  createTypeAwareChunker,
  chunkDocuments,
} from "./chunker.js";

function normalizeFileId(relativePath) {
  let slug = relativePath.replace(/\\\\/g, "/");
  slug = slug.replace(/\.(md|mdx)$/i, "");
  if (slug.endsWith("/index")) {
    slug = slug.slice(0, -"/index".length);
  }
  return slug;
}

function normalizeText(value) {
  return value.trim().replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeTags(tags) {
  if (!tags) return [];
  const values = Array.isArray(tags) ? tags : [tags];
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function buildDeterministicHash({
  source = "",
  section = "",
  chunkIndex = 0,
  text = "",
} = {}) {
  const normalized = normalizeText(
    `${String(source || "")}:${String(section || "")}:${String(chunkIndex)}:${String(text || "")}`,
  );
  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex")
    .slice(0, 16);
}

function buildCanonicalSource(collection, slug) {
  const normalizedSlug = String(slug || "").replace(/^\/+|\/+$/g, "");
  if (!normalizedSlug) return "/";

  if (collection === "blog") return `/blog/posts/${normalizedSlug}`;
  if (collection === "snippets") return `/blog/snippets/${normalizedSlug}`;
  return `/${normalizedSlug}`;
}

function buildCanonicalUrl(siteOrigin, source) {
  const base = String(siteOrigin || "https://www.sahilrana.in").replace(
    /\/+$/,
    "",
  );
  const canonicalSource = String(source || "/").replace(/\/+$/, "") || "/";
  const normalizedSource = canonicalSource.startsWith("/")
    ? canonicalSource
    : `/${canonicalSource}`;
  return `${base}${normalizedSource}`;
}

function extractSummary(data, content) {
  const directSummary = normalizeText(data.description ?? data.summary ?? "");
  if (directSummary) return directSummary.slice(0, 280);

  const plainText = normalizeText(removeMarkdown(content || ""));
  if (!plainText) return "";

  const firstSentence = plainText.match(/[^.!?]+[.!?]?/);
  return firstSentence
    ? firstSentence[0].trim().slice(0, 280)
    : plainText.slice(0, 280);
}

function buildEmbeddingInput(data, content, maxChars) {
  const blocks = [];
  const title = data.title || data.name || "Untitled";
  const tags = Array.isArray(data.tags)
    ? data.tags.filter(Boolean).map(String)
    : data.tags
      ? [String(data.tags)]
      : [];
  const summary = extractSummary(data, content);

  if (title) {
    blocks.push(`Title: ${title}`);
  }
  if (summary) {
    blocks.push(`Summary: ${summary}`);
  }
  if (tags.length > 0) {
    blocks.push(`Tags: ${tags.join(", ")}`);
  }

  const plainText = removeMarkdown(content || "");
  if (plainText) {
    blocks.push(`Content: ${plainText}`);
  }

  const joined = normalizeText(blocks.join("\n\n"));
  return joined.length > maxChars
    ? `${joined.slice(0, maxChars).trim()}...`
    : joined;
}

function inferType(collection) {
  if (collection === "blog") return "blog";
  if (collection === "project") return "project";
  if (collection === "about") return "about";
  if (collection === "snippets" || collection === "resource") return "resource";
  if (collection === "experience") return "experience";
  if (collection === "faq") return "faq";
  return "other";
}

function getMetadata(
  data,
  collection,
  slug,
  sourcePath,
  siteOrigin = "https://www.sahilrana.in",
) {
  const { tags, image, ...cleanData } = data;
  const normalizedTags = normalizeTags(tags);
  const source = buildCanonicalSource(collection, slug);
  const summary = extractSummary(cleanData, "");
  const metadata = {
    type: inferType(collection),
    collection,
    slug,
    source,
    url: buildCanonicalUrl(siteOrigin, source),
    title: cleanData.title || cleanData.name || slugToTitle(slug),
    summary,
    tags: normalizedTags,
    language: "en",
    isPublic: true,
    chunkIndex: 0,
    totalChunks: 1,
    hash: "",
  };

  if (cleanData.description) metadata.description = cleanData.description;
  if (cleanData.pubDate) metadata.publishedAt = String(cleanData.pubDate);
  if (cleanData.updatedAt) metadata.updatedAt = String(cleanData.updatedAt);
  if (cleanData.author) metadata.author = cleanData.author;
  if (cleanData.featured !== undefined)
    metadata.isPublic = Boolean(cleanData.featured);

  metadata.hash = buildDeterministicHash({
    source: metadata.source,
    section: metadata.title,
    chunkIndex: metadata.chunkIndex,
    text: metadata.title,
  });

  return metadata;
}

export class ContentLoader {
  constructor({
    contentSections,
    rootDir = process.cwd(),
    maxEmbeddingChars,
    blogChunkerConfig,
    siteOrigin = SITE_ORIGIN,
  }) {
    this.contentSections = contentSections;
    this.rootDir = rootDir;
    this.maxEmbeddingChars = maxEmbeddingChars;
    this.blogChunker = createBlogChunker(blogChunkerConfig);
    this.typeAwareChunker = createTypeAwareChunker({
      blogChunker: this.blogChunker,
      htmlChunker: this.blogChunker,
      homepageChunker: this.blogChunker,
    });
    this.siteOrigin = siteOrigin;
  }

  async collectContentFiles() {
    const allFiles = [];

    for (const section of this.contentSections) {
      const sectionRoot = path.join(this.rootDir, section.baseDir);
      const files = await fg(["**/*.{md,mdx}"], {
        cwd: sectionRoot,
        ignore: ["**/_*.*", "**/node_modules/**"],
      });

      for (const file of files) {
        allFiles.push({
          collection: section.collection,
          filePath: path.join(sectionRoot, file),
          relativePath: file,
        });
      }
    }

    return allFiles;
  }

  async loadDocuments() {
    const contentFiles = await this.collectContentFiles();
    const documents = [];

    for (const { collection, filePath, relativePath } of contentFiles) {
      const source = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(source);
      const slug = normalizeFileId(relativePath);
      const id = `${collection}:${slug}`;
      const text = buildEmbeddingInput(data, content, this.maxEmbeddingChars);
      const metadata = getMetadata(
        data,
        collection,
        slug,
        path.relative(this.rootDir, filePath),
        this.siteOrigin,
      );

      if (!text) {
        console.warn(
          `Skipping ${filePath} because no text could be extracted.`,
        );
        continue;
      }

      documents.push({
        id,
        text,
        metadata: {
          ...metadata,
          text: removeMarkdown(content || ""),
          source: metadata.source,
          url: metadata.url,
          type: metadata.type,
          summary: metadata.summary,
          title: metadata.title,
          tags: metadata.tags,
          hash: metadata.hash,
          language: metadata.language,
          isPublic: metadata.isPublic,
        },
      });
    }

    return documents;
  }

  /**
   * Chunk loaded documents into smaller pieces
   * @param {Array} documents - Documents from loadDocuments()
   * @param {Object} options - Chunking options
   * @returns {Array} Chunked documents
   */
  async chunkDocuments(documents, options = {}) {
    const { enableTokenOptimization = false } = options;

    // Prepare documents for chunking
    const docsForChunking = documents.map((doc) => ({
      content: doc.text,
      metadata: doc.metadata,
    }));

    // Apply chunking with a type-aware strategy so blog content keeps the semantic
    // structure needed for high-quality retrieval without reducing document fidelity.
    const chunkedDocs = chunkDocuments(docsForChunking, this.typeAwareChunker, {
      preserveLeadContent: enableTokenOptimization,
    });

    // Reformat to match expected output structure
    return chunkedDocs.map((chunk) => {
      const section =
        chunk.metadata.sectionHeading ||
        chunk.metadata.section ||
        chunk.metadata.title ||
        "";
      const chunkIndex = Number(chunk.metadata.chunkIndex ?? 0);
      const totalChunks = Number(chunk.metadata.totalChunks ?? 1);
      const source = chunk.metadata.source || "/";
      const url =
        chunk.metadata.url || buildCanonicalUrl(this.siteOrigin, source);

      return {
        id: `${chunk.metadata.parentId}:chunk${chunkIndex}`,
        text: chunk.content,
        metadata: {
          type: chunk.metadata.type || "other",
          source,
          url,
          title: chunk.metadata.title || "Untitled",
          summary: chunk.metadata.summary || "",
          text: chunk.content,
          tags: Array.isArray(chunk.metadata.tags) ? chunk.metadata.tags : [],
          chunkIndex,
          totalChunks,
          hash: buildDeterministicHash({
            source,
            section,
            chunkIndex,
            text: chunk.content,
          }),
          section: section || undefined,
          language: chunk.metadata.language || "en",
          isPublic: chunk.metadata.isPublic !== false,
          ...(chunk.metadata.project
            ? { project: String(chunk.metadata.project) }
            : {}),
          ...(chunk.metadata.techStack
            ? {
                techStack: Array.isArray(chunk.metadata.techStack)
                  ? chunk.metadata.techStack
                      .map((item) => String(item).trim().toLowerCase())
                      .filter(Boolean)
                  : [
                      String(chunk.metadata.techStack).trim().toLowerCase(),
                    ].filter(Boolean),
              }
            : {}),
          ...(chunk.metadata.category
            ? { category: String(chunk.metadata.category).toLowerCase() }
            : {}),
          ...(chunk.metadata.publishedAt
            ? { publishedAt: String(chunk.metadata.publishedAt) }
            : {}),
          ...(chunk.metadata.updatedAt
            ? { updatedAt: String(chunk.metadata.updatedAt) }
            : {}),
        },
      };
    });
  }
}
