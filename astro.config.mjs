import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import compressor from "astro-compressor";
import playformInline from "@playform/inline";
import playformCompress from "@playform/compress";
import { astroImageTools } from "astro-imagetools";

import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  site: "https://sahilsinghrana.github.io",
  integrations: [partytown(), sitemap(), astroImageTools, playformInline(), playformCompress(), compressor()],
  prefetch: {
    defaultStrategy: "viewport"
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark"
    }
  }
});