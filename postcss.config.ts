import cssnano from "cssnano";
import postcssDupSelectors from "postcss-combine-duplicated-selectors";

import postcssPresetEnv from "postcss-preset-env";

const isProd = process.env.NODE_ENV === "production";

const config = {
  map: isProd ? false : { inline: true },

  plugins: [
    // Keep optimization out of dev; preserve CSS compatibility transforms below.
    isProd &&
      postcssDupSelectors({
        removeDuplicatedProperties: false,
        removeDuplicatedValues: true,
      }),
    postcssPresetEnv({
      stage: 3,
      features: {
        "nesting-rules": true,
        "custom-properties": true,
      },
      autoprefixer: { grid: true },
      preserve: false,
    }),

    isProd && cssnano({ preset: "advanced" }),
  ].filter(Boolean),
};

export default config;
