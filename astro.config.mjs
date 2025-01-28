import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import rehypeExternalLinks from "rehype-external-links";
import partytown from "@astrojs/partytown";
import purgecss from "astro-purgecss";

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  trailingSlash: "ignore",
  site: "https://sahilrana.in",
  build: {
    format: "file",
  },
  integrations: [
    sitemap(),
    purgecss(),
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
  ],
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
