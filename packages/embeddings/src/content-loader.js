import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import matter from "gray-matter";
import removeMarkdown from "remove-markdown";

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

function buildEmbeddingInput(data, content, maxChars) {
  const blocks = [];

  if (data.title) {
    blocks.push(`Title: ${data.title}`);
  }
  if (data.description) {
    blocks.push(`Description: ${data.description}`);
  }

  const plainText = removeMarkdown(content || "");
  if (plainText) {
    blocks.push(`Content: ${plainText}`);
  }

  const joined = normalizeText(blocks.join("\n\n"));
  return joined.length > maxChars ? `${joined.slice(0, maxChars)}...` : joined;
}

function getMetadata(data, collection, slug, sourcePath) {
  const metadata = {
    collection,
    slug,
    sourcePath,
    url: `/${collection}/${slug}`,
  };

  if (data.title) metadata.title = data.title;
  if (data.description) metadata.description = data.description;
  if (data.tags) metadata.tags = data.tags;
  if (data.pubDate) metadata.pubDate = String(data.pubDate);
  if (data.author) metadata.author = data.author;
  if (data.featured !== undefined) metadata.featured = Boolean(data.featured);

  return metadata;
}

export class ContentLoader {
  constructor({ contentSections, rootDir = process.cwd(), maxEmbeddingChars }) {
    this.contentSections = contentSections;
    this.rootDir = rootDir;
    this.maxEmbeddingChars = maxEmbeddingChars;
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
        metadata: { ...metadata, content: removeMarkdown(content || "") },
      });
    }

    return documents;
  }
}
