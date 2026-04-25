import path from "path";
import dotenv from "dotenv";

const DEFAULT_CONTENT_SECTIONS = [
  { collection: "blog", baseDir: "src/content/blog" },
  { collection: "snippets", baseDir: "src/content/snippets" },
];
const DEFAULT_BATCH_SIZE = 16;
const DEFAULT_MAX_EMBEDDING_CHARS = 32000;

function buildPineconeBaseUrl(indexName, environment) {
  if (!indexName || !environment) return undefined;
  return `https://${indexName}-${environment}.svc.pinecone.io`;
}

function normalizeOpenRouterServerURL(urlString) {
  if (!urlString) return undefined;

  try {
    const normalized = new URL(urlString);
    let pathname = normalized.pathname.replace(/\/+$/, "");

    if (pathname.endsWith("/embeddings")) {
      pathname = pathname.slice(0, -"/embeddings".length);
    }

    if (normalized.hostname === "openrouter.ai") {
      if (pathname === "" || pathname === "/") {
        pathname = "/api/v1";
      } else if (pathname === "/v1") {
        pathname = "/api/v1";
      }
    }

    if (pathname === "" || pathname === "/") {
      pathname = "/api/v1";
    }

    normalized.pathname = pathname;
    return normalized.toString();
  } catch {
    return urlString;
  }
}

function requireVariable(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(options = {}) {
  const envPath = path.resolve(options.envPath ?? process.cwd(), ".env");
  dotenv.config({ path: envPath });

  const openRouterApiKey =
    process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_KEY;
  const openRouterApiUrl =
    process.env.OPENROUTER_API_URL ??
    process.env.OPENROUTER_BASE_URL ??
    process.env.OPENROUTER_URL;
  const openRouterModel =
    process.env.OPENROUTER_MODEL ?? "nvidia/llama-nemotron-embed-vl-1b-v2:free";

  const pineconeApiKey =
    process.env.PINECONE_API_KEY ?? process.env.PINECONE_KEY;
  const pineconeEnvironment = process.env.PINECONE_ENVIRONMENT;
  const pineconeControllerHost = process.env.PINECONE_CONTROLLER_HOST;
  const pineconeIndexName = process.env.PINECONE_INDEX_NAME;
  const pineconeNamespace = process.env.PINECONE_NAMESPACE;
  const pineconeBaseUrl =
    process.env.PINECONE_BASE_URL ??
    process.env.PINECONE_URL ??
    buildPineconeBaseUrl(pineconeIndexName, pineconeEnvironment);

  requireVariable("OPENROUTER_API_KEY", openRouterApiKey);
  requireVariable("PINECONE_API_KEY", pineconeApiKey);
  requireVariable("PINECONE_INDEX_NAME", pineconeIndexName);

  if (!pineconeBaseUrl && !pineconeEnvironment && !pineconeControllerHost) {
    throw new Error(
      "Missing Pinecone configuration. Set PINECONE_BASE_URL or PINECONE_ENVIRONMENT or PINECONE_CONTROLLER_HOST.",
    );
  }

  return {
    openRouterApiKey,
    openRouterApiUrl: normalizeOpenRouterServerURL(openRouterApiUrl),
    openRouterModel,
    pineconeApiKey,
    pineconeEnvironment,
    pineconeControllerHost,
    pineconeIndexName,
    pineconeNamespace,
    pineconeBaseUrl,
    contentSections: options.contentSections ?? DEFAULT_CONTENT_SECTIONS,
    pageDistDir: options.pageDistDir ?? process.env.PAGE_DIST_DIR ?? "dist",
    pageSourceDir:
      options.pageSourceDir ?? process.env.PAGE_SOURCE_DIR ?? "src/pages",
    pageCollectionName:
      options.pageCollectionName ?? process.env.PAGE_COLLECTION_NAME ?? "pages",
    batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
    maxEmbeddingChars: options.maxEmbeddingChars ?? DEFAULT_MAX_EMBEDDING_CHARS,
  };
}
