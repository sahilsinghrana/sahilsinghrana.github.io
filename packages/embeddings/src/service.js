function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export class EmbeddingsPipeline {
  constructor({
    contentLoader,
    contentLoaders,
    embedder,
    indexer,
    batchSize,
    chunkingOptions,
  }) {
    const loaders = [];

    if (contentLoader) loaders.push(contentLoader);
    if (Array.isArray(contentLoaders)) loaders.push(...contentLoaders);

    if (loaders.length === 0) {
      throw new Error(
        "EmbeddingsPipeline requires at least one content loader.",
      );
    }

    this.contentLoaders = loaders;
    this.embedder = embedder;
    this.indexer = indexer;
    this.batchSize = batchSize;
    this.chunkingOptions = chunkingOptions || { enabled: false };
  }

  async generate() {
    const documentMap = new Map();

    for (const loader of this.contentLoaders) {
      let documents = await loader.loadDocuments();

      // Apply chunking if enabled
      if (
        this.chunkingOptions.enabled &&
        typeof loader.chunkDocuments === "function"
      ) {
        console.log(
          `Chunking ${documents.length} documents with ${loader.constructor.name}...`,
        );
        documents = await loader.chunkDocuments(documents, {
          enableTokenOptimization:
            this.chunkingOptions.tokenOptimization?.enabled ?? false,
        });
        console.log(`Chunked into ${documents.length} chunks.`);
      }

      for (const document of documents) {
        if (!document || !document.id) {
          continue;
        }

        if (documentMap.has(document.id)) {
          console.warn(`Skipping duplicate document id ${document.id}`);
          continue;
        }

        documentMap.set(document.id, document);
      }
    }

    const documents = Array.from(documentMap.values());

    if (documents.length === 0) {
      console.log("No content documents found for embedding generation.");
      return { documents: 0, upserted: 0 };
    }

    console.log(
      `Preparing ${documents.length} embedding documents from ${this.contentLoaders.length} loaders.`,
    );

    const embeddedDocuments = await this.embedDocuments(documents);
    const upsertResult = await this.indexer.upsert(embeddedDocuments);

    console.log(
      `Upserting ${embeddedDocuments.length} vectors to Pinecone index ${this.indexer.indexName}.`,
    );
    return {
      documents: documents.length,
      upserted: embeddedDocuments.length,
      result: upsertResult,
    };
  }

  async embedDocuments(documents) {
    const batches = chunkArray(documents, this.batchSize);
    const embedded = [];

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(
        `Embedding batch ${batchIndex + 1}/${batches.length} (${batch.length} items)...`,
      );
      const texts = batch.map((document) => document.text);
      const embeddings = await this.embedder.embedTexts(texts);

      embedded.push(
        ...batch.map((document, index) => ({
          ...document,
          embedding: embeddings[index],
        })),
      );
    }

    return embedded;
  }
}
