import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import rehypeExternalLinks from "rehype-external-links";
import partytown from "@astrojs/partytown";
import purgecss from "astro-purgecss";
import { astroImageTools } from "astro-imagetools";

// https://astro.build/config
export default defineConfig({
  experimental: {
    contentCollectionCache: true,
  },
  compressHTML: true,
  trailingSlash: "ignore",
  site: "https://sahilsinghrana.github.io",
  build: {
    format: "file",
  },
  integrations: [astroImageTools, partytown(), sitemap(), purgecss()],
  prefetch: {
    defaultStrategy: "viewport",
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
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
