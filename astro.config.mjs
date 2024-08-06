import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import playformInline from "@playform/inline";
// import playformCompress from "@playform/compress";
import rehypeExternalLinks from "rehype-external-links";
import partytown from "@astrojs/partytown";
import purgecss from "astro-purgecss";

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
  integrations: [
    partytown(),
    sitemap(),
    purgecss(),
    playformInline(),
    // playformCompress({
    //   brotli: false,
    // }),
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
