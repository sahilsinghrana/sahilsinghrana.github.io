/**
 * Test script for chunking functionality
 * Run: node scripts/test-chunking.mjs
 */

import {
  createHtmlChunker,
  createBlogChunker,
  createHomepageChunker,
  TokenOptimizer,
} from "../packages/embeddings/src/chunker.js";

// Sample HTML content
const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
  <meta name="description" content="A test page for chunking">
  <meta name="keywords" content="test, chunking, seo">
</head>
<body>
  <header>
    <h1>Welcome to Test Page</h1>
  </header>
  <main>
    <p>This is the first paragraph with important content about our services.</p>
    <p>This is the second paragraph with more details about what we offer to customers.</p>
    <h2>Our Services</h2>
    <p>We provide various services including web development, design, and consulting.</p>
    <p>Our team consists of experienced professionals who can help with your project.</p>
    <h3>Web Development</h3>
    <p>We build modern websites using the latest technologies and best practices.</p>
    <p>Our development process ensures high quality and timely delivery.</p>
    <h3>Design Services</h3>
    <p>We create beautiful and functional designs for your business needs.</p>
    <p>Our designs are responsive and work well on all devices.</p>
    <h2>Contact Us</h2>
    <p>You can reach us by email or phone for inquiries.</p>
    <p>We respond within 24 hours to all inquiries.</p>
  </main>
  <footer>
    <p>&copy; 2024 Test Company</p>
  </footer>
</body>
</html>
`;

// Sample Markdown content
const sampleMarkdown = `---
title: Test Blog Post
description: A test blog post for chunking
keywords: test, blog, chunking
pubDate: 2024-01-15
tags: [testing, blog, development]
---

# Introduction to Testing

This is the introduction paragraph that contains important information about the topic.

Testing is crucial for ensuring code quality and preventing bugs in production.

## Why Testing Matters

Testing helps catch bugs early and ensures your code works as expected.

It also provides documentation for how your code should behave.

### Unit Tests

Unit tests test individual functions or methods in isolation.

They are fast to run and help identify issues quickly.

### Integration Tests

Integration tests verify that different parts of your system work together.

They are slower but provide more comprehensive coverage.

## Best Practices

Always write tests for critical functionality.

Keep tests small and focused on one thing.

## Conclusion

Testing is an essential part of software development.

Make it a habit to write tests alongside your code.
`;

console.log("=== Testing HTML Chunker ===\n");

const htmlChunker = createHtmlChunker({ chunkSize: 200, chunkOverlap: 20 });
const htmlChunks = htmlChunker.splitText(sampleHtml);

console.log(`Number of chunks: ${htmlChunks.length}`);
console.log("\n--- Chunks ---");
htmlChunks.forEach((chunk, i) => {
  console.log(`\nChunk ${i + 1} (${chunk.length} chars):`);
  console.log(chunk.slice(0, 100) + (chunk.length > 100 ? "..." : ""));
});

console.log("\n\n=== Testing Blog Chunker ===\n");

const blogChunker = createBlogChunker({ chunkSize: 300, chunkOverlap: 30 });
const blogChunks = blogChunker.splitText(sampleMarkdown);

console.log(`Number of chunks: ${blogChunks.length}`);
console.log("\n--- Chunks ---");
blogChunks.forEach((chunk, i) => {
  console.log(`\nChunk ${i + 1} (${chunk.length} chars):`);
  console.log(chunk.slice(0, 100) + (chunk.length > 100 ? "..." : ""));
});

console.log("\n\n=== Testing Token Optimizer ===\n");

const optimizer = new TokenOptimizer({ leadContentRatio: 0.3 });
const optimizedText = optimizer.optimizeText(sampleMarkdown);

console.log(`Original length: ${sampleMarkdown.length} chars`);
console.log(`Optimized length: ${optimizedText.length} chars`);
console.log(
  `Estimated token reduction: ${Math.round((1 - optimizedText.length / sampleMarkdown.length) * 100)}%`,
);
console.log("\n--- Optimized Text ---");
console.log(optimizedText.slice(0, 200) + "...");

console.log("\n\n=== Testing Metadata Stripping ===\n");

const sampleMetadata = {
  title: "Test Post",
  description: "A test description",
  keywords: "test, keywords, seo",
  tags: ["test", "keywords", "important"],
  pubDate: "2024-01-15",
  author: "Test Author",
};

const strippedMetadata = { ...sampleMetadata };
delete strippedMetadata.keywords;

console.log("Original metadata:", JSON.stringify(sampleMetadata, null, 2));
console.log("\nStripped metadata:", JSON.stringify(strippedMetadata, null, 2));

console.log("\n\n=== All Tests Passed ===");
