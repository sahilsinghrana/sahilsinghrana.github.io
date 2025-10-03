import purgecss from "astro-purgecss";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import rehypeExternalLinks from "rehype-external-links";

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
    experimental: true,
  },
  assetCacheKey: true,
  integrations: [purgecss(), sitemap()],
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
