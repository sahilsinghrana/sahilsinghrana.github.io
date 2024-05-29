import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import compressor from "astro-compressor";

import playformInline from "@playform/inline";
import playformCompress from "@playform/compress";

// https://astro.build/config
export default defineConfig({
  compressHTML: false,
  site: "https://sahilsinghrana.github.io",
  integrations: [sitemap(), playformInline(), playformCompress(), compressor()],
  prefetch: {
    defaultStrategy: "load",
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
