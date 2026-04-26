import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import { htmlToText } from "html-to-text";
import matter from "gray-matter";
import removeMarkdown from "remove-markdown";
import {
  createHtmlChunker,
  createHomepageChunker,
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

function getMetadata(collection, slug, sourcePath, url) {
  return {
    collection,
    slug,
    sourcePath,
    url,
  };
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
    this.distIgnore = distIgnore;
    this.sourceIgnore = sourceIgnore;
    this.htmlChunker = createHtmlChunker(htmlChunkerConfig);
    this.homepageChunker = createHomepageChunker(homepageChunkerConfig);
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
      const metadata = getMetadata(
        this.collectionName,
        slug,
        path.relative(this.rootDir, filePath),
        url,
      );
      const content = text.slice(0, this.maxEmbeddingChars ?? text.length);

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
      const metadata = getMetadata(
        this.collectionName,
        slug,
        path.relative(this.rootDir, filePath),
        url,
      );
      const content = normalizeText(text).slice(
        0,
        this.maxEmbeddingChars ?? text.length,
      );

      if (!content) {
        console.warn(`Skipping ${filePath} because no text was extracted.`);
        continue;
      }

      documents.push({ id, text: content, metadata });
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

    // Chunk homepage with special chunker (link-aware)
    if (homepageDocs.length > 0) {
      console.log(
        `Found ${homepageDocs.length} homepage document(s), using link-aware chunking...`,
      );

      const docsForChunking = homepageDocs.map((doc) => ({
        content: doc.text,
        metadata: doc.metadata,
      }));

      const homepageChunked = chunkHomepageDocuments(
        docsForChunking,
        this.homepageChunker,
        {
          preserveLeadContent: enableTokenOptimization,
        },
      );

      // Reformat with homepage-specific metadata
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

    // Chunk other pages with standard HTML chunker
    if (otherDocs.length > 0) {
      const docsForChunking = otherDocs.map((doc) => ({
        content: doc.text,
        metadata: doc.metadata,
      }));

      const otherChunked = chunkDocuments(docsForChunking, this.htmlChunker, {
        preserveLeadContent: enableTokenOptimization,
      });

      // Reformat to match expected output structure
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
