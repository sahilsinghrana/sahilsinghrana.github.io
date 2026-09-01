import { Pinecone } from "@pinecone-database/pinecone";

function resolvePineconeHostFromBaseUrl(baseUrl) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

function sanitizeMetadata(metadata = {}) {
  const sanitized = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      sanitized[key] = value
        .filter((entry) => entry !== undefined && entry !== null)
        .map((entry) => String(entry).trim().toLowerCase())
        .slice(0, 20);
      continue;
    }

    if (typeof value === "object") {
      sanitized[key] = sanitizeMetadata(value);
      continue;
    }

    sanitized[key] = typeof value === "string" ? value.slice(0, 2000) : value;
  }

  if (!sanitized.type) {
    sanitized.type = "page";
  }

  if (Array.isArray(sanitized.tags)) {
    sanitized.tags = [
      ...new Set(
        sanitized.tags
          .map((tag) => String(tag).trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  }

  if (!sanitized.url || !sanitized.source || !sanitized.hash) {
    throw new Error(
      "Vector metadata is missing required fields: url, source, and hash.",
    );
  }

  return sanitized;
}

export class PineconeIndexer {
  constructor({
    apiKey,
    environment,
    controllerHost,
    baseUrl,
    indexName,
    namespace,
    embeddingDimension,
  }) {
    if (!apiKey) {
      throw new Error("Pinecone API key is required to upsert vectors.");
    }

    this.indexName = indexName;
    this.namespace = namespace;
    this.embeddingDimension = embeddingDimension ?? null;
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

  validateVectorDimension(values) {
    if (this.embeddingDimension == null) {
      return values;
    }

    if (!Array.isArray(values) || values.length !== this.embeddingDimension) {
      throw new Error(
        `Embedding dimension mismatch: expected ${this.embeddingDimension}, received ${Array.isArray(values) ? values.length : "non-array"}.`,
      );
    }

    return values;
  }

  buildMetadataFilter({ type, tags, url, source } = {}) {
    const filter = {};

    if (type) {
      filter.type = type;
    }

    if (Array.isArray(tags) && tags.length > 0) {
      filter.tags = {
        $in: tags.map((tag) => String(tag).trim().toLowerCase()),
      };
    }

    if (url) {
      filter.url = url;
    }

    if (source) {
      filter.source = source;
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  normalizeQueryFilter(filter) {
    if (!filter) return undefined;

    const normalized = { ...filter };

    if (Array.isArray(normalized.tags) && normalized.tags.length > 0) {
      normalized.tags = {
        $in: normalized.tags.map((tag) => String(tag).trim().toLowerCase()),
      };
    }

    return normalized;
  }

  async query({
    vector,
    topK = 5,
    filter,
    scoreThreshold,
    includeMetadata = true,
    includeValues = false,
  } = {}) {
    if (!Array.isArray(vector)) {
      throw new Error("A vector is required for Pinecone similarity queries.");
    }

    const normalizedFilter = this.normalizeQueryFilter(
      filter ?? this.buildMetadataFilter(filter),
    );

    const payload = {
      vector: this.validateVectorDimension(vector),
      topK,
      includeMetadata,
      includeValues,
    };

    if (normalizedFilter) {
      payload.filter = normalizedFilter;
    }

    if (this.namespace) {
      payload.namespace = this.namespace;
    }

    const response = await this.index.query(payload);
    const matches = Array.isArray(response?.matches) ? response.matches : [];

    if (scoreThreshold == null) {
      return matches;
    }

    return matches.filter(
      (match) => Number(match?.score ?? 0) >= Number(scoreThreshold),
    );
  }

  async upsert(vectors) {
    const records = vectors.map((vector) => ({
      id: vector.id,
      values: this.validateVectorDimension(vector.embedding),
      metadata: sanitizeMetadata(vector.metadata),
    }));

    const payload = { records };
    if (this.namespace) {
      payload.namespace = this.namespace;
    }

    return this.index.upsert(payload);
  }
}
