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
  contentCollectionCache: true,
  prefetch: {
    defaultStrategy: "hover",
  },

  vite: {},
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
