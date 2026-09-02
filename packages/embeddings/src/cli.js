#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import {
  loadConfig,
  createEmbeddingsPipeline,
  exportCorpusManifest,
} from "./index.js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const config = loadConfig();

if (dryRun) {
  const manifest = await exportCorpusManifest(config);
  const outPath = path.resolve(
    process.cwd(),
    process.env.EMBED_MANIFEST_PATH ?? ".embeddings/manifest.json",
  );
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(
    `Dry-run complete. ${manifest.documentCount} documents exported to ${outPath}. No embeddings or Pinecone writes were performed.`,
  );
  process.exit(0);
}

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
