import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import { htmlToText } from "html-to-text";
import matter from "gray-matter";
import removeMarkdown from "remove-markdown";

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
}
