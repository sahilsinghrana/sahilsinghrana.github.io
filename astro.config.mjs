import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

import playformCompress from "@playform/compress";

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  site: "https://sahilsinghrana.github.io",
  integrations: [sitemap(), playformCompress()],
  prefetch: {
    defaultStrategy: "viewport"
  }
});