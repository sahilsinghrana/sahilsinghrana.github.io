import { defineConfig } from "astro-imagetools/config";

/**
 * @type {import('astro-imagetools').GlobalConfigOptions}
 */
export default defineConfig({
  placeholder: "blurred", // "dominantColor" | "blurred" | "tracedSVG" | "none"
  preload: "webp",
  fallbackFormat: "png",
});
