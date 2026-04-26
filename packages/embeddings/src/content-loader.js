import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import matter from "gray-matter";
import removeMarkdown from "remove-markdown";
import { createBlogChunker, chunkDocuments } from "./chunker.js";

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
  // Strip keywords from metadata to reduce token usage
  const { keywords, ...cleanData } = data;

  const metadata = {
    collection,
    slug,
    sourcePath,
    url: `/${collection}/${slug}`,
  };

  // Keep: title, description, pubDate, tags (strip keywords from tags if present)
  if (cleanData.title) metadata.title = cleanData.title;
  if (cleanData.description) metadata.description = cleanData.description;
  if (cleanData.pubDate) metadata.pubDate = String(cleanData.pubDate);
  if (cleanData.author) metadata.author = cleanData.author;
  if (cleanData.featured !== undefined)
    metadata.featured = Boolean(cleanData.featured);

  // Keep tags but ensure keywords are not included
  if (cleanData.tags && Array.isArray(cleanData.tags)) {
    metadata.tags = cleanData.tags.filter(
      (t) => typeof t === "string" && !t.toLowerCase().includes("keyword"),
    );
  }

  return metadata;
}

export class ContentLoader {
  constructor({
    contentSections,
    rootDir = process.cwd(),
    maxEmbeddingChars,
    blogChunkerConfig,
  }) {
    this.contentSections = contentSections;
    this.rootDir = rootDir;
    this.maxEmbeddingChars = maxEmbeddingChars;
    this.blogChunker = createBlogChunker(blogChunkerConfig);
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

    // Apply chunking
    const chunkedDocs = chunkDocuments(docsForChunking, this.blogChunker, {
      preserveLeadContent: enableTokenOptimization,
    });

    // Reformat to match expected output structure
    return chunkedDocs.map((chunk) => ({
      id: `${chunk.metadata.parentId}:chunk${chunk.metadata.chunkIndex}`,
      text: chunk.content,
      metadata: {
        ...chunk.metadata,
        // Also store content in metadata for Pinecone
        content: chunk.content,
      },
    }));
  }
}
