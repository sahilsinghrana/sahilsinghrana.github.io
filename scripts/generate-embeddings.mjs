import {
  loadConfig,
  createEmbeddingsPipeline,
} from "@sahilsinghrana/embeddings";

const config = loadConfig();
const pipeline = createEmbeddingsPipeline(config);

try {
  await pipeline.generate();
} catch (error) {
  console.error("Embedding generation failed:", error);
  process.exit(1);
}
