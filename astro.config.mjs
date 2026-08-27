// import purgecss from "astro-purgecss";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import rehypeExternalLinks from "rehype-external-links";
import playformInline from "@playform/inline";

import playformCompress from "@playform/compress";

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  trailingSlash: "never",
  site: "https://www.sahilrana.in",
  redirects: {
    "/blog/posts/method-chaining-js": "/blog/posts/chain-javascript-methods",
    "/blog/posts/howto/linked-list-with-generators":
      "/blog/posts/linked-list-with-generators",
    "/blog/posts/howto/convert-string-to-literal":
      "/blog/posts/convert-string-to-literal",
  },
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
            if (
              id.includes("node_modules/three") &&
              !id.includes("OrbitControls")
            ) {
              return "vendor-threejs";
            }

            if (
              id.endsWith("/3dMoon/moon.js") ||
              id.includes("OrbitControls")
            ) {
              return "3dmoon-core";
            }
          },
        },
      },
    },
  },
  contentCollectionCache: true,
  prefetch: {
    defaultStrategy: "viewport",
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/404"),
    }),
    playformInline(),
    // purgecss(),
    playformCompress({
      CSS: true,
      HTML: true,
      Image: false,
      JavaScript: true,
      SVG: true,
    }),
    // compressor({
    //   gzip: true,
    //   brotli: true,
    //   zstd: true,
    // }),
  ],
  markdown: {
    processor: unified({
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
    }),
    shikiConfig: {
      theme: "github-dark",
      langs: ["js", "ts", "html", "css", "bash"],
    },
  },
  fonts: [
    {
      name: "Raleway",
      provider: fontProviders.local(),
      cssVariable: "--font-raleway",
      options: {
        variants: [
          {
            weight: "400",
            style: "normal",
            display: "optional",
            src: ["./src/assets/fonts/Raleway-Regular.woff2"],
          },
        ],
      },
    },
    {
      name: "Inter",
      provider: fontProviders.local(),
      cssVariable: "--font-inter",
      options: {
        variants: [
          {
            weight: "400",
            style: "normal",
            display: "optional",
            src: ["./src/assets/fonts/Inter-Regular.woff2"],
          },
          {
            weight: "600",
            style: "normal",
            display: "optional",
            src: ["./src/assets/fonts/Inter-SemiBold.woff2"],
          },
          {
            weight: "800",
            style: "normal",
            display: "optional",
            src: ["./src/assets/fonts/Inter-ExtraBold.woff2"],
          },
        ],
      },
    },
  ],
});
