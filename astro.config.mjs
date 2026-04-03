import purgecss from "astro-purgecss";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import rehypeExternalLinks from "rehype-external-links";
import compressor from "astro-compressor";

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  trailingSlash: "ignore",
  site: "https://sahilrana.in",
  build: {
    format: "file",
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/three")) {
              return "threejs-vendor";
            }
          },
        },
      },
    },
  },
  contentCollectionCache: true,
  prefetch: {
    defaultStrategy: "hover",
  },
  integrations: [
    purgecss(),
    sitemap(),
    compressor({
      gzip: true,
      brotli: true,
      zstd: true,
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      langs: ["js", "ts", "html", "css", "bash"],
    },
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          content: {
            type: "text",
            value: " 🔗",
          },
        },
      ],
    ],
  },
});
