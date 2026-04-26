/**
 * Custom Text Chunking Module
 *
 * Provides chunking strategies for HTML pages and Blog content
 * without requiring LangChain dependencies.
 */

// Default separators for different content types
const HTML_SEPARATORS = [
  "\n\n",
  "\n",
  "<p>",
  "<h1>",
  "<h2>",
  "<h3>",
  "<h4>",
  "<h5>",
  "<h6>",
  "<li>",
  "<tr>",
  " ",
  "",
];
const MARKDOWN_SEPARATORS = [
  "\n\n",
  "\n",
  "## ",
  "### ",
  "#### ",
  "```\n",
  "```",
  "- ",
  "* ",
  "1. ",
  " ",
  "",
];

/**
 * Recursive text splitter - splits text by trying progressively smaller separators
 * Similar to LangChain's RecursiveCharacterTextSplitter
 */
export class RecursiveTextSplitter {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize ?? 1024;
    this.chunkOverlap = options.chunkOverlap ?? 128;
    this.separators = options.separators ?? HTML_SEPARATORS;
    this.stripEmpty = options.stripEmpty ?? true;
  }

  /**
   * Split text into chunks
   * @param {string} text - Text to split
   * @returns {string[]} Array of text chunks
   */
  splitText(text) {
    if (!text || text.length === 0) return [];

    // Clean the text first
    let cleanedText = this._cleanText(text);

    // If text is smaller than chunk size, return as-is
    if (cleanedText.length <= this.chunkSize) {
      return cleanedText.trim() ? [cleanedText] : [];
    }

    // Try splitting with separators
    const chunks = this._splitWithSeparators(cleanedText, this.separators);

    // Merge small chunks and apply overlap
    return this._mergeChunks(chunks);
  }

  _cleanText(text) {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  _splitWithSeparators(text, separators) {
    if (separators.length === 0 || text.length <= this.chunkSize) {
      return [text];
    }

    const separator = separators[0];
    const remainingSeparators = separators.slice(1);

    // If separator is empty string, split by characters
    if (separator === "") {
      return this._splitByChar(text);
    }

    const parts = this._splitBySeparator(text, separator);

    // If we got only one part, try next separator
    if (parts.length === 1) {
      return this._splitWithSeparators(text, remainingSeparators);
    }

    // Recursively split each part
    const chunks = [];
    for (const part of parts) {
      if (part.trim().length === 0) continue;

      if (part.length <= this.chunkSize) {
        chunks.push(part);
      } else {
        chunks.push(...this._splitWithSeparators(part, remainingSeparators));
      }
    }

    return chunks;
  }

  _splitBySeparator(text, separator) {
    const parts = [];
    let current = "";
    let start = 0;

    // Find all occurrences of separator
    let idx = text.indexOf(separator);

    while (idx !== -1) {
      // Include the separator in the previous chunk
      const chunk = text.slice(start, idx + separator.length);
      if (chunk.trim()) {
        parts.push(chunk);
      }
      start = idx + separator.length;
      idx = text.indexOf(separator, start);
    }

    // Add remaining text
    const remaining = text.slice(start);
    if (remaining.trim()) {
      parts.push(remaining);
    }

    return parts.length > 0 ? parts : [text];
  }

  _splitByChar(text) {
    const chunks = [];
    for (let i = 0; i < text.length; i += this.chunkSize) {
      const chunk = text.slice(i, i + this.chunkSize);
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }

  _mergeChunks(chunks) {
    if (chunks.length === 0) return [];
    if (chunks.length === 1) return chunks;

    const merged = [];
    let current = chunks[0];

    for (let i = 1; i < chunks.length; i++) {
      const next = chunks[i];

      // If adding next chunk would exceed limit, push current and start new
      if (current.length + next.length > this.chunkSize && current.length > 0) {
        merged.push(current);
        current = next;
      } else {
        // Merge with overlap
        current = current + next;
      }
    }

    // Don't forget the last chunk
    if (current.length > 0) {
      merged.push(current);
    }

    return merged;
  }
}

/**
 * Markdown-aware text splitter
 * Preserves markdown structure (headers, code blocks, lists)
 */
export class MarkdownTextSplitter extends RecursiveTextSplitter {
  constructor(options = {}) {
    super({
      ...options,
      chunkSize: options.chunkSize ?? 1536,
      chunkOverlap: options.chunkOverlap ?? 154,
      separators: options.separators ?? MARKDOWN_SEPARATORS,
    });
  }

  _cleanText(text) {
    // Markdown-specific cleaning
    return super
      ._cleanText(text)
      .replace(/^```\w*\n[\s\S]*?^```/gm, (match) => match) // Keep code blocks intact
      .replace(/`[^`]+`/g, (match) => match); // Keep inline code intact
  }
}

/**
 * Token optimization utilities
 * Prioritizes lead content (intro + key sections)
 */
export class TokenOptimizer {
  constructor(options = {}) {
    this.leadContentRatio = options.leadContentRatio ?? 0.3;
  }

  /**
   * Extract lead content from text
   * Lead content = first portion of document that typically contains key information
   * @param {string} text - Text to optimize
   * @returns {string} Optimized text with lead content prioritized
   */
  optimizeText(text) {
    if (!text || text.length === 0) return "";

    const totalLength = text.length;
    const leadLength = Math.floor(totalLength * this.leadContentRatio);

    // Extract first 30% (lead content)
    const leadText = text.slice(0, leadLength);

    // Find first heading to identify key sections
    const headingMatch = text.slice(leadLength).match(/^#{1,6}\s+.+$/m);

    if (headingMatch) {
      const headingPos = leadLength + headingMatch.index;
      // Include content up to first heading after lead section
      return text.slice(0, headingPos);
    }

    return leadText;
  }

  /**
   * Calculate estimated token count (rough approximation)
   * @param {string} text - Text to count tokens for
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    // Rough estimate: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }
}

/**
 * Create HTML page chunker
 * @param {Object} options - Chunking options
 * @returns {RecursiveTextSplitter} Configured chunker
 */
export function createHtmlChunker(options = {}) {
  return new RecursiveTextSplitter({
    chunkSize: options.chunkSize ?? 1024,
    chunkOverlap: options.chunkOverlap ?? 102,
    separators: options.separators ?? HTML_SEPARATORS,
  });
}

/**
 * Create Blog content chunker
 * @param {Object} options - Chunking options
 * @returns {MarkdownTextSplitter} Configured chunker
 */
export function createBlogChunker(options = {}) {
  return new MarkdownTextSplitter({
    chunkSize: options.chunkSize ?? 1536,
    chunkOverlap: options.chunkOverlap ?? 154,
    separators: options.separators ?? MARKDOWN_SEPARATORS,
  });
}

/**
 * Strip keywords from metadata
 * @param {Object} metadata - Document metadata
 * @returns {Object} Cleaned metadata without keywords
 */
export function stripKeywords(metadata) {
  const { tags, ...clean } = metadata;
  return clean;
}

/**
 * Chunk documents with metadata
 * @param {Array} documents - Array of document objects with content and metadata
 * @param {Object} chunker - Chunker instance (HTML or Blog)
 * @param {Object} options - Additional options
 * @returns {Array} Array of chunked documents with metadata
 */
export function chunkDocuments(documents, chunker, options = {}) {
  const { preserveLeadContent = false, tokenOptimizer = null } = options;

  const chunkedDocs = [];

  for (const doc of documents) {
    let content = doc.content;

    // Apply token optimization if enabled
    if (preserveLeadContent && tokenOptimizer) {
      content = tokenOptimizer.optimizeText(content);
    }

    // Split content into chunks
    const chunks = chunker.splitText(content);

    // Create chunked documents with parent metadata
    for (let i = 0; i < chunks.length; i++) {
      chunkedDocs.push({
        content: chunks[i],
        metadata: {
          ...doc.metadata,
          chunkIndex: i,
          totalChunks: chunks.length,
          parentId: `${doc.metadata.collection}:${doc.metadata.slug}`,
          contentType: doc.metadata.collection === "pages" ? "html" : "blog",
          leadContent: preserveLeadContent && tokenOptimizer ? i === 0 : false,
        },
      });
    }
  }

  return chunkedDocs;
}

/**
 * Reconstruct document from chunks
 * @param {Array} chunks - Array of chunk objects
 * @returns {string} Reconstructed text
 */
export function reconstructDocument(chunks) {
  // Sort by chunkIndex
  const sorted = [...chunks].sort(
    (a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex,
  );

  // Join content
  return sorted.map((c) => c.content).join("\n\n");
}

// ============================================================
// HOMEPAGE-SPECIFIC CHUNKER
// Enhanced chunking for homepage and its navigation links
// ============================================================

/**
 * Homepage-aware text splitter
 * Creates semantic chunks for homepage content and each linked page
 */
export class HomepageTextSplitter extends RecursiveTextSplitter {
  constructor(options = {}) {
    super({
      ...options,
      chunkSize: options.chunkSize ?? 800,
      chunkOverlap: options.chunkOverlap ?? 80,
      separators: options.separators ?? HOMEPAGE_SEPARATORS,
    });
    this.linkPatterns = [
      /href=["']([^"']+)["']/g, // HTML href links
      /\[([^\]]+)\]\([^)]+\)/g, // Markdown links [text](url)
      /<a[^>]+href=["']([^"']+)["'][^>]*>/gi, // Anchor tags
    ];
  }

  /**
   * Extract navigation links from content
   * @param {string} text - HTML or text content
   * @returns {Array} Array of link objects with text and url
   */
  extractLinks(text) {
    const links = [];

    // Extract HTML anchor links
    const htmlLinkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = htmlLinkRegex.exec(text)) !== null) {
      links.push({
        url: match[1],
        text: match[2].trim(),
        type: "html",
      });
    }

    // Extract Markdown links
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = mdLinkRegex.exec(text)) !== null) {
      // Avoid duplicates
      if (!links.find((l) => l.url === match[2])) {
        links.push({
          url: match[2],
          text: match[1].trim(),
          type: "markdown",
        });
      }
    }

    return links;
  }

  /**
   * Split homepage content with link awareness
   * Creates chunks that preserve link context
   * @param {string} text - Homepage content
   * @returns {Array} Array of chunks with link metadata
   */
  splitHomepageContent(text) {
    if (!text || text.length === 0) return [];

    const cleanedText = this._cleanText(text);

    // Extract links before splitting
    const links = this.extractLinks(cleanedText);

    // If text is smaller than chunk size, return as-is with links
    if (cleanedText.length <= this.chunkSize) {
      return cleanedText.trim()
        ? [
            {
              content: cleanedText,
              links: links,
              isHomepage: true,
            },
          ]
        : [];
    }

    // Split content while preserving link context
    const chunks = this._splitWithLinkContext(cleanedText, links);

    // Merge small chunks and apply overlap
    return this._mergeHomepageChunks(chunks);
  }

  /**
   * Split text while tracking which links fall in which chunks
   * @param {string} text - Text to split
   * @param {Array} links - Extracted links
   * @returns {Array} Chunks with associated links
   */
  _splitWithLinkContext(text, links) {
    const chunks = [];
    const baseSeparators = this.separators;

    // First try splitting by major sections (headings, paragraphs)
    const sectionSeparators = baseSeparators.slice(0, 6); // Up to h3

    let currentPos = 0;
    let currentLinks = [];

    for (const separator of sectionSeparators) {
      if (separator === "") continue;

      const regex = new RegExp(this._escapeRegex(separator), "g");
      let match;
      const positions = [];

      // Find all separator positions
      const searchText = text.slice(currentPos);
      while ((match = regex.exec(searchText)) !== null) {
        positions.push({
          pos: currentPos + match.index,
          separator: separator,
        });
      }

      if (positions.length > 0) {
        // Sort by position
        positions.sort((a, b) => a.pos - b.pos);

        // Create chunks at each section boundary
        let lastPos = 0;
        for (const pos of positions) {
          if (pos.pos - lastPos > 50) {
            // Skip very small sections
            const sectionContent = text.slice(lastPos, pos.pos);

            // Find links that fall in this section
            const sectionLinks = links.filter((l) => {
              const linkPos = text.indexOf(l.url, lastPos);
              return linkPos >= lastPos && linkPos < pos.pos;
            });

            chunks.push({
              content: sectionContent.trim(),
              links: sectionLinks,
              sectionStart: lastPos,
              sectionEnd: pos.pos,
            });
          }
          lastPos = pos.pos;
        }

        // Handle remaining content
        if (lastPos < text.length) {
          const remainingContent = text.slice(lastPos);
          const remainingLinks = links.filter((l) => {
            const linkPos = text.indexOf(l.url, lastPos);
            return linkPos >= lastPos;
          });

          if (remainingContent.trim()) {
            chunks.push({
              content: remainingContent.trim(),
              links: remainingLinks,
              sectionStart: lastPos,
              sectionEnd: text.length,
            });
          }
        }

        break; // Successfully split, exit loop
      }
    }

    // If no sections found, use fallback splitting
    if (chunks.length === 0) {
      return this._fallbackSplit(text, links);
    }

    return chunks;
  }

  /**
   * Fallback splitting when no clear sections found
   */
  _fallbackSplit(text, links) {
    const chunks = [];
    const chunkSize = this.chunkSize;

    for (let i = 0; i < text.length; i += chunkSize - this.chunkOverlap) {
      const chunkText = text.slice(i, i + chunkSize);
      if (!chunkText.trim()) continue;

      // Find links in this chunk
      const chunkLinks = links.filter((l) => {
        const linkPos = text.indexOf(l.url, i);
        return linkPos >= i && linkPos < i + chunkSize;
      });

      chunks.push({
        content: chunkText.trim(),
        links: chunkLinks,
        sectionStart: i,
        sectionEnd: Math.min(i + chunkSize, text.length),
      });
    }

    return chunks;
  }

  /**
   * Merge chunks while preserving link context
   */
  _mergeHomepageChunks(chunks) {
    if (chunks.length === 0) return [];
    if (chunks.length === 1) return chunks;

    const merged = [];
    let current = { ...chunks[0] };

    for (let i = 1; i < chunks.length; i++) {
      const next = chunks[i];

      // If adding next chunk would exceed limit, push current and start new
      if (
        current.content.length + next.content.length > this.chunkSize &&
        current.content.length > 0
      ) {
        merged.push(current);
        current = { ...next };
      } else {
        // Merge with overlap - combine links
        current.content = current.content + "\n" + next.content;
        current.links = [
          ...new Map(
            [...current.links, ...next.links].map((l) => [l.url, l]),
          ).values(),
        ];
        current.sectionEnd = next.sectionEnd;
      }
    }

    // Don't forget the last chunk
    if (current.content.length > 0) {
      merged.push(current);
    }

    return merged;
  }

  _escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

// Homepage-specific separators - prioritize sections and links
const HOMEPAGE_SEPARATORS = [
  "\n\n", // Paragraphs
  "\n", // Lines
  "<h1>", // Main headings
  "<h2>", // Section headings
  "<h3>", // Subsection headings
  "<section", // HTML sections
  "<div", // Divisions (may contain links)
  "<nav", // Navigation areas (high link density)
  "<ul>", // Lists (often contain links)
  "<li>", // List items
  " ", // Words
  "", // Characters (fallback)
];

/**
 * Create Homepage chunker
 * @param {Object} options - Chunking options
 * @returns {HomepageTextSplitter} Configured chunker
 */
export function createHomepageChunker(options = {}) {
  return new HomepageTextSplitter({
    chunkSize: options.chunkSize ?? 800,
    chunkOverlap: options.chunkOverlap ?? 80,
    separators: options.separators ?? HOMEPAGE_SEPARATORS,
  });
}

/**
 * Enhanced chunk documents for homepage with link awareness
 * @param {Array} documents - Array of document objects
 * @param {Object} chunker - Chunker instance
 * @param {Object} options - Additional options
 * @returns {Array} Chunked documents with link metadata
 */
export function chunkHomepageDocuments(documents, chunker, options = {}) {
  const { preserveLeadContent = false, tokenOptimizer = null } = options;

  const chunkedDocs = [];

  for (const doc of documents) {
    let content = doc.content;

    // Apply token optimization if enabled
    if (preserveLeadContent && tokenOptimizer) {
      content = tokenOptimizer.optimizeText(content);
    }

    // Use homepage-aware splitting
    const chunks = chunker.splitHomepageContent(content);

    // Create chunked documents with parent metadata and links
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      chunkedDocs.push({
        content: chunk.content,
        metadata: {
          ...doc.metadata,
          chunkIndex: i,
          totalChunks: chunks.length,
          parentId: `${doc.metadata.collection}:${doc.metadata.slug}`,
          contentType: "homepage",
          isHomepage: true,
          // Store links found in this chunk for agent awareness
          linksInChunk: chunk.links || [],
          linkCount: (chunk.links || []).length,
          leadContent: preserveLeadContent && tokenOptimizer ? i === 0 : false,
        },
      });
    }
  }

  return chunkedDocs;
}
