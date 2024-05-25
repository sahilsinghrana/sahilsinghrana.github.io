import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  site: "https://sahilsinghrana.github.io",
  integrations: [sitemap()],
  prefetch: {
    defaultStrategy: "viewport",
  },
});
