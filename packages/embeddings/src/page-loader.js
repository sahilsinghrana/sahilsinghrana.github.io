import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import fg from "fast-glob";
import { htmlToText } from "html-to-text";
import matter from "gray-matter";
import removeMarkdown from "remove-markdown";
import { SITE_ORIGIN } from "../../../scripts/site.mjs";
import {
  createHtmlChunker,
  createHomepageChunker,
  createTypeAwareChunker,
  chunkDocuments,
  chunkHomepageDocuments,
} from "./chunker.js";

function normalizeFileId(relativePath) {
  let slug = relativePath.replace(/\\\\/g, "/");
  slug = slug.replace(/\.(html|md|mdx|astro)$/i, "");
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

function slugToTitle(slug) {
  if (!slug) return "Untitled page";
  return slug
    .split("/")
    .filter(Boolean)
    .join(" ")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractPageSummary(text) {
  const cleaned = normalizeText(text || "");
  if (!cleaned) return "";

  const firstSentence = cleaned.match(/[^.!?]+[.!?]?/);
  return firstSentence
    ? firstSentence[0].trim().slice(0, 280)
    : cleaned.slice(0, 280);
}

function buildPageEmbeddingInput(title, url, text, maxChars) {
  const blocks = [];
  const summary = extractPageSummary(text);

  if (title) {
    blocks.push(`Title: ${title}`);
  }
  if (url) {
    blocks.push(`URL: ${url}`);
  }
  if (summary) {
    blocks.push(`Summary: ${summary}`);
  }
  if (text) {
    blocks.push(`Content: ${normalizeText(text)}`);
  }

  const joined = normalizeText(blocks.join("\n\n"));
  return joined.length > maxChars
    ? `${joined.slice(0, maxChars).trim()}...`
    : joined;
}

function buildPageUrl(relativePath) {
  const normalized = relativePath.replace(/\\\\/g, "/");
  const urlPath = normalized
    .replace(/\/index\.html$/i, "")
    .replace(/\.html$/i, "");

  return urlPath === "" ? "/" : `/${urlPath}`;
}

function cleanHtmlContent(html) {
  return normalizeText(
    htmlToText(html, {
      wordwrap: false,
      selectors: [
        { selector: "header", format: "skip" },
        { selector: "nav", format: "skip" },
        { selector: "footer", format: "skip" },
        { selector: "script", format: "skip" },
        { selector: "style", format: "skip" },
      ],
    }),
  );
}

function cleanAstroContent(source) {
  const withoutFrontmatter = source.replace(/^---[\s\S]*?---/, "");
  const withoutImports = withoutFrontmatter.replace(/^import\s.*$/gm, "");
  const withoutDirectives = withoutImports.replace(/^{[^}]*}/gm, "");
  const withoutTags = withoutDirectives.replace(/<[^>]+>/g, " ");
  const withoutMarkdown = removeMarkdown(withoutTags);
  return normalizeText(withoutMarkdown);
}

function inferType(collection) {
  if (collection === "pages") return "page";
  if (collection === "about") return "about";
  if (collection === "project") return "project";
  if (collection === "experience") return "experience";
  if (collection === "faq") return "faq";
  return "other";
}

function getMetadata(
  collection,
  slug,
  sourcePath,
  url,
  summary = "",
  siteOrigin = "https://www.sahilrana.in",
) {
  const normalizedTags = normalizeTags([]);
  const source = buildCanonicalSource(collection, slug);
  const metadata = {
    type: inferType(collection),
    collection,
    slug,
    source,
    url: buildCanonicalUrl(siteOrigin, source),
    summary,
    tags: normalizedTags,
    title: slugToTitle(slug),
    language: "en",
    isPublic: true,
    chunkIndex: 0,
    totalChunks: 1,
    hash: "",
  };

  metadata.hash = buildDeterministicHash({
    source: metadata.source,
    section: metadata.title,
    chunkIndex: metadata.chunkIndex,
    text: metadata.title,
  });

  return metadata;
}

export class PageLoader {
  constructor({
    rootDir = process.cwd(),
    distDir = "dist",
    sourceDir = "src/pages",
    collectionName = "pages",
    maxEmbeddingChars,
    htmlChunkerConfig,
    homepageChunkerConfig,
    siteOrigin = SITE_ORIGIN,
    distIgnore = [
      "**/404.html",
      "**/blog/posts/**/*.html",
      "**/blog/snippets/**/*.html",
      "**/_*",
      "**/assets/**",
    ],
    sourceIgnore = ["**/_*.*", "**/[*.astro"],
  } = {}) {
    this.rootDir = rootDir;
    this.distDir = path.resolve(rootDir, distDir);
    this.sourceDir = path.resolve(rootDir, sourceDir);
    this.collectionName = collectionName;
    this.maxEmbeddingChars = maxEmbeddingChars;
    this.siteOrigin = siteOrigin;
    this.distIgnore = distIgnore;
    this.sourceIgnore = sourceIgnore;
    this.htmlChunker = createHtmlChunker(htmlChunkerConfig);
    this.homepageChunker = createHomepageChunker(homepageChunkerConfig);
    this.typeAwareChunker = createTypeAwareChunker({
      blogChunker: this.htmlChunker,
      htmlChunker: this.htmlChunker,
      homepageChunker: this.homepageChunker,
    });
  }

  async distExists() {
    try {
      const stats = await fs.stat(this.distDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async collectDistPages() {
    const htmlFiles = await fg(["**/*.html"], {
      cwd: this.distDir,
      ignore: this.distIgnore,
    });

    return htmlFiles.map((relativePath) => ({
      filePath: path.join(this.distDir, relativePath),
      relativePath,
    }));
  }

  async collectSourcePages() {
    const pageFiles = await fg(["**/*.{astro,md,mdx}"], {
      cwd: this.sourceDir,
      ignore: this.sourceIgnore,
    });

    return pageFiles.map((relativePath) => ({
      filePath: path.join(this.sourceDir, relativePath),
      relativePath,
    }));
  }

  async loadDocuments() {
    if (await this.distExists()) {
      return this.loadDistDocuments();
    }

    return this.loadSourceDocuments();
  }

  async loadDistDocuments() {
    const pageFiles = await this.collectDistPages();
    const documents = [];

    for (const { filePath, relativePath } of pageFiles) {
      const source = await fs.readFile(filePath, "utf-8");
      const text = cleanHtmlContent(source);
      const slug = normalizeFileId(relativePath);
      const id = `${this.collectionName}:${slug}`;
      const url = buildPageUrl(relativePath);
      const summary = extractPageSummary(text);
      const metadata = getMetadata(
        this.collectionName,
        slug,
        path.relative(this.rootDir, filePath),
        url,
        summary,
      );
      const content = buildPageEmbeddingInput(
        slugToTitle(slug),
        url,
        text,
        this.maxEmbeddingChars ?? text.length,
      );

      if (!content) {
        console.warn(`Skipping ${filePath} because no text was extracted.`);
        continue;
      }

      documents.push({ id, text: content, metadata: { ...metadata, content } });
    }

    return documents;
  }

  async loadSourceDocuments() {
    const pageFiles = await this.collectSourcePages();
    const documents = [];

    for (const { filePath, relativePath } of pageFiles) {
      const source = await fs.readFile(filePath, "utf-8");
      const text = filePath.endsWith(".astro")
        ? cleanAstroContent(source)
        : removeMarkdown(matter(source).content || "");

      const slug = normalizeFileId(relativePath);
      const id = `${this.collectionName}:${slug}`;
      const url = `/${slug}`;
      const summary = extractPageSummary(text);
      const metadata = getMetadata(
        this.collectionName,
        slug,
        path.relative(this.rootDir, filePath),
        url,
        summary,
      );
      const content = buildPageEmbeddingInput(
        slugToTitle(slug),
        url,
        text,
        this.maxEmbeddingChars ?? text.length,
      );

      if (!content) {
        console.warn(`Skipping ${filePath} because no text was extracted.`);
        continue;
      }

      documents.push({ id, text: content, metadata: { ...metadata, content } });
    }

    return documents;
  }

  /**
   * Check if a document is the homepage
   * @param {Object} document - Document with metadata
   * @returns {boolean} True if homepage
   */
  _isHomepage(document) {
    const slug = document.metadata?.slug || "";
    const url = document.metadata?.url || "";

    // Check for common homepage patterns
    const homepagePatterns = ["index", "home", ""];
    const isIndexPage = homepagePatterns.includes(slug.toLowerCase());
    const isRootUrl = url === "/" || url === "";

    return isIndexPage || isRootUrl;
  }

  /**
   * Chunk loaded documents into smaller pieces
   * @param {Array} documents - Documents from loadDocuments()
   * @param {Object} options - Chunking options
   * @returns {Array} Chunked documents
   */
  async chunkDocuments(documents, options = {}) {
    const { enableTokenOptimization = false } = options;

    // Separate homepage from other pages
    const homepageDocs = documents.filter((doc) => this._isHomepage(doc));
    const otherDocs = documents.filter((doc) => !this._isHomepage(doc));

    const chunkedDocs = [];

    // Use a type-aware strategy for the real ingestion path so homepage, page and
    // sectioned static content all keep semantic context without losing structure.
    if (homepageDocs.length > 0) {
      console.log(
        `Found ${homepageDocs.length} homepage document(s), using link-aware chunking...`,
      );

      const docsForChunking = homepageDocs.map((doc) => ({
        content: doc.text,
        metadata: { ...doc.metadata, isHomepage: true },
      }));

      const homepageChunked = chunkDocuments(
        docsForChunking,
        this.typeAwareChunker,
        {
          preserveLeadContent: enableTokenOptimization,
        },
      );

      for (const chunk of homepageChunked) {
        chunkedDocs.push({
          id: `${chunk.metadata.parentId}:chunk${chunk.metadata.chunkIndex}`,
          text: chunk.content,
          metadata: {
            ...chunk.metadata,
            content: chunk.content,
          },
        });
      }
    }

    if (otherDocs.length > 0) {
      const docsForChunking = otherDocs.map((doc) => ({
        content: doc.text,
        metadata: doc.metadata,
      }));

      const otherChunked = chunkDocuments(
        docsForChunking,
        this.typeAwareChunker,
        {
          preserveLeadContent: enableTokenOptimization,
        },
      );

      for (const chunk of otherChunked) {
        chunkedDocs.push({
          id: `${chunk.metadata.parentId}:chunk${chunk.metadata.chunkIndex}`,
          text: chunk.content,
          metadata: {
            ...chunk.metadata,
            content: chunk.content,
          },
        });
      }
    }

    return chunkedDocs;
  }
}
