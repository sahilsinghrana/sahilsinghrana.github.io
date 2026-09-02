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

export function createEmbeddingsPipeline(config, options = {}) {
  const contentLoader = new ContentLoader({
    contentSections: config.contentSections,
    maxEmbeddingChars: config.maxEmbeddingChars,
    blogChunkerConfig: config.blogChunker,
  });

  const loaders = [contentLoader];

  if (options.includePageLoader ?? process.env.EMBED_PAGE_LOADER === "1") {
    loaders.push(
      new PageLoader({
        distDir: config.pageDistDir,
        sourceDir: config.pageSourceDir,
        collectionName: config.pageCollectionName,
        maxEmbeddingChars: config.maxEmbeddingChars,
        htmlChunkerConfig: config.htmlChunker,
        homepageChunkerConfig: config.homepageChunker,
      }),
    );
  }

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
    embeddingDimension: config.embeddingDimension,
  });

  const chunkingOptions = {
    enabled: config.chunking?.enabled ?? false,
    tokenOptimization: config.tokenOptimization,
  };

  return new EmbeddingsPipeline({
    contentLoaders: loaders,
    embedder,
    indexer,
    batchSize: config.batchSize,
    chunkingOptions,
  });
}

export async function exportCorpusManifest(config, options = {}) {
  const pipeline = createEmbeddingsPipeline(config, options);
  const documentMap = new Map();

  for (const loader of pipeline.contentLoaders) {
    let documents = await loader.loadDocuments();
    if (
      pipeline.chunkingOptions.enabled &&
      typeof loader.chunkDocuments === "function"
    ) {
      documents = await loader.chunkDocuments(documents, {
        enableTokenOptimization:
          pipeline.chunkingOptions.tokenOptimization?.enabled ?? false,
      });
    }

    for (const document of documents) {
      if (!document?.id || documentMap.has(document.id)) continue;
      documentMap.set(document.id, document);
    }
  }

  const documents = Array.from(documentMap.values()).sort((a, b) =>
    String(a.id).localeCompare(String(b.id)),
  );

  if (documents.length === 0) {
    throw new Error("Export produced zero documents");
  }

  const ids = new Set();
  for (const document of documents) {
    if (ids.has(document.id)) {
      throw new Error(`Duplicate document id detected: ${document.id}`);
    }
    ids.add(document.id);
  }

  return {
    corpusVersion: config.pineconeNamespace,
    embeddingModel: config.openRouterModel,
    embeddingDimension: config.embeddingDimension,
    documentCount: documents.length,
    documents,
  };
}
