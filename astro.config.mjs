// import purgecss from "astro-purgecss";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import rehypeExternalLinks from "rehype-external-links";
// import compressor from "astro-compressor";
import playformInline from "@playform/inline";

import playformCompress from "@playform/compress";

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  trailingSlash: "never",
  site: "https://sahilrana.in",
  build: {
    format: "file",
    inlineStylesheets: "always",
  },
  image: {
    config: {
      webp: {
        effort: 6,
        quality: 50,
        alphaQuality: 50,
      },
      avif: {
        effort: 6,
        quality: 40,
        chromaSubsampling: "4:2:0",
      },
      jpeg: {
        mozjpeg: true,
        quality: 50,
      },
      png: {
        compressionLevel: 9,
        // palette: true,
      },
    },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/three")) {
              return "threejs-vendor";
            }
          },
        },
      },
    },
  },
  contentCollectionCache: true,
  prefetch: {
    defaultStrategy: "hover",
  },
  integrations: [
    sitemap(),
    playformInline(),
    // purgecss(),
    playformCompress({
      CSS: true,
      HTML: true,
      Image: false,
      JavaScript: true,
      SVG: true,
      Logger: 1,
    }),
    // compressor({
    //   gzip: true,
    //   brotli: true,
    //   zstd: true,
    // }),
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
  fonts: [
    {
      name: "Manrope",
      provider: fontProviders.local(),
      cssVariable: "--font-manrope",
      options: {
        display: "swap",
        variants: [
          {
            weight: "200",
            style: "normal",
            src: [
              "./src/assets/fonts/ManropeExtraLight-Regular.woff2",
              "./src/assets/fonts/ManropeExtraLight-Regular.woff",
              "./src/assets/fonts/Manrope-Regular.ttf",
            ],
          },
          {
            weight: "600",
            style: "normal",
            src: [
              "./src/assets/fonts/ManropeExtraLight-SemiBold.woff2",
              "./src/assets/fonts/ManropeExtraLight-SemiBold.woff",
            ],
          },
          {
            weight: "800",
            style: "normal",
            src: [
              "./src/assets/fonts/ManropeExtraLight-ExtraBold.woff2",
              "./src/assets/fonts/ManropeExtraLight-ExtraBold.woff",
            ],
          },
        ],
      },
    },
    {
      name: "Raleway",
      provider: fontProviders.local(),
      cssVariable: "--font-raleway",
      options: {
        display: "optional",
        variants: [
          {
            weight: "400",
            style: "normal",
            src: ["./src/assets/fonts/Raleway-Regular.ttf"],
          },
        ],
      },
    },
    {
      name: "Roboto",
      provider: fontProviders.local(),
      cssVariable: "--font-roboto",
      options: {
        display: "optional",
        variants: [
          {
            weight: "400",
            style: "normal",
            src: [
              "./src/assets/fonts/Roboto-Regular.woff2",
              "./src/assets/fonts/Roboto-Regular.woff",
              "./src/assets/fonts/Roboto-Regular.ttf",
            ],
          },
        ],
      },
    },
    {
      name: "Inter",
      provider: fontProviders.local(),
      cssVariable: "--font-inter",
      options: {
        display: "optional",
        variants: [
          {
            weight: "200",
            style: "normal",
            src: [
              "./src/assets/fonts/Inter-ExtraLight.woff2",
              "./src/assets/fonts/Inter-ExtraLight.woff",
            ],
          },
          {
            weight: "400",
            style: "normal",
            src: [
              "./src/assets/fonts/Inter-Regular.woff2",
              "./src/assets/fonts/Inter-Regular.woff",
            ],
          },
          {
            weight: "600",
            style: "normal",
            src: [
              "./src/assets/fonts/Inter-SemiBold.woff2",
              "./src/assets/fonts/Inter-SemiBold.woff",
            ],
          },
          {
            weight: "800",
            style: "normal",
            src: [
              "./src/assets/fonts/Inter-ExtraBold.woff2",
              "./src/assets/fonts/Inter-ExtraBold.woff",
            ],
          },
        ],
      },
    },
  ],
});
