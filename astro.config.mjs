import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  compressHTML: true,
  site: "https://sahilsinghrana.github.io",
  integrations: [sitemap()],
  prefetch: {
    defaultStrategy: "load",
  },
});
