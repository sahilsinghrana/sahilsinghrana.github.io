import { loadConfig } from "./config.js";
import { ContentLoader } from "./content-loader.js";
import { PageLoader } from "./page-loader.js";
import { OpenRouterEmbeddingsClient } from "./openrouter-client.js";
import { PineconeIndexer } from "./pinecone-client.js";
import { EmbeddingsPipeline } from "./service.js";

export {
  loadConfig,
  ContentLoader,
  PageLoader,
  OpenRouterEmbeddingsClient,
  PineconeIndexer,
  EmbeddingsPipeline,
};

export function createEmbeddingsPipeline(config) {
  const contentLoader = new ContentLoader({
    contentSections: config.contentSections,
    maxEmbeddingChars: config.maxEmbeddingChars,
    blogChunkerConfig: config.blogChunker,
  });

  const pageLoader = new PageLoader({
    distDir: config.pageDistDir,
    sourceDir: config.pageSourceDir,
    collectionName: config.pageCollectionName,
    maxEmbeddingChars: config.maxEmbeddingChars,
    htmlChunkerConfig: config.htmlChunker,
    homepageChunkerConfig: config.homepageChunker,
  });

  const embedder = new OpenRouterEmbeddingsClient({
    apiKey: config.openRouterApiKey,
    model: config.openRouterModel,
    serverURL: config.openRouterApiUrl,
  });

  const indexer = new PineconeIndexer({
    apiKey: config.pineconeApiKey,
    environment: config.pineconeEnvironment,
    controllerHost: config.pineconeControllerHost,
    baseUrl: config.pineconeBaseUrl,
    indexName: config.pineconeIndexName,
    namespace: config.pineconeNamespace,
  });

  // Determine chunking options from config
  const chunkingOptions = {
    enabled: config.chunking?.enabled ?? false,
    tokenOptimization: config.tokenOptimization,
  };

  return new EmbeddingsPipeline({
    contentLoaders: [contentLoader, pageLoader],
    embedder,
    indexer,
    batchSize: config.batchSize,
    chunkingOptions,
  });
}
