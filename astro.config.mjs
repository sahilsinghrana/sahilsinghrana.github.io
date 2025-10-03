import purgecss from "astro-purgecss";
import sitemap from "@astrojs/sitemap";
import partytown from "@astrojs/partytown";
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
  integrations: [
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
    purgecss(),
    sitemap(),
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
