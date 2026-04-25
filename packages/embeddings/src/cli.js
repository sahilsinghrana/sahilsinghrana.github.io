#!/usr/bin/env node
import { loadConfig, createEmbeddingsPipeline } from "./index.js";

const config = loadConfig();
const pipeline = createEmbeddingsPipeline(config);

try {
  const result = await pipeline.generate();
  console.log(
    `Embedding collection complete. Documents: ${result.documents}, Upserted: ${result.upserted}`,
  );
} catch (error) {
  console.error("Embedding generation failed:", error);
  process.exit(1);
}
