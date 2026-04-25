import { Pinecone } from "@pinecone-database/pinecone";

function resolvePineconeHostFromBaseUrl(baseUrl) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

export class PineconeIndexer {
  constructor({
    apiKey,
    environment,
    controllerHost,
    baseUrl,
    indexName,
    namespace,
  }) {
    if (!apiKey) {
      throw new Error("Pinecone API key is required to upsert vectors.");
    }

    this.indexName = indexName;
    this.namespace = namespace;
    this.client = new Pinecone({
      apiKey,
      environment,
      controllerHost,
    });
    this.baseUrl = baseUrl;
  }

  get index() {
    if (!this._index) {
      if (this.baseUrl) {
        this._index = this.client.index({
          host: resolvePineconeHostFromBaseUrl(this.baseUrl),
        });
      } else {
        this._index = this.client.index({
          name: this.indexName,
        });
      }
    }
    return this._index;
  }

  async upsert(vectors) {
    const records = vectors.map((vector) => ({
      id: vector.id,
      values: vector.embedding,
      metadata: vector.metadata,
    }));

    const payload = { records };
    if (this.namespace) {
      payload.namespace = this.namespace;
    }

    return this.index.upsert(payload);
  }
}
