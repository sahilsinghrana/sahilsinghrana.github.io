import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import compressor from "astro-compressor";
import playformInline from "@playform/inline";
import playformCompress from "@playform/compress";
import rehypeExternalLinks from 'rehype-external-links';

import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  compressHTML: false,
  trailingSlash: "ignore",
  site: "https://sahilsinghrana.github.io",
  build: {
    format: "file",
  },
  integrations: [
    partytown(),
    sitemap(),
    playformInline(),
    playformCompress({ brotli : false }),
    compressor(),
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
          content: { type: 'text', value: ' 🔗' }
        }
      ],
    ]
  },
});
