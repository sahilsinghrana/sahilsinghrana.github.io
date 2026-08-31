import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import rehypeExternalLinks from "rehype-external-links";
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
    inlineStylesheets: "auto", // Leverages caching for large CSS, inlines small critical CSS
  },

  image: {
    service: {
      config: {
        webp: {
          effort: 4,
          quality: 75,
        },
        avif: {
          effort: 4,
          quality: 65,
          chromaSubsampling: "4:2:0",
        },
        jpeg: {
          mozjpeg: true,
          quality: 75,
        },
        png: {
          compressionLevel: 9,
        },
      },
    },
  },

  vite: {
    build: {
      chunkSizeWarningLimit: 800,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "vendor-threejs",
                test: /[\\/]node_modules[\\/]three[\\/]/,
              },
              {
                name: "3dmoon-core",
                test: /[\\/]3dMoon[\\/]moon\.js$|[\\/]OrbitControls/,
              },
            ],
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
    sitemap({
      filter: (page) => !page.includes("/404"),
    }),
    playformCompress({
      CSS: true,
      HTML: true,
      Image: false, // Handled by Astro Assets
      JavaScript: true,
      SVG: true,
    }),
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
            display: "swap",
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
            display: "swap",
            src: ["./src/assets/fonts/Inter-Regular.woff2"],
          },
          {
            weight: "600",
            style: "normal",
            display: "swap",
            src: ["./src/assets/fonts/Inter-SemiBold.woff2"],
          },
          {
            weight: "800",
            style: "normal",
            display: "swap",
            src: ["./src/assets/fonts/Inter-ExtraBold.woff2"],
          },
        ],
      },
    },
  ],
});
