import postcssImport from "postcss-import";
import postcssFlexbugsFixes from "postcss-flexbugs-fixes";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import postcssReporter from "postcss-reporter";
import postcssDupSelectors from "postcss-combine-duplicated-selectors";
import postcssUrl from "postcss-url";
import postcssPresetEnv from "postcss-preset-env";

const isProd = process.env.NODE_ENV === "production";

const config = {
  map: isProd ? false : { inline: true },

  plugins: [
    postcssImport,
    postcssFlexbugsFixes(),
    postcssUrl({
      url: "inline",
      maxSize: 10,
      fallback: "copy",
    }),
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

    autoprefixer,
    cssnano({ preset: "advanced" }),
    postcssReporter({
      clearReportedMessages: true,
      throwError: false,
    }),
  ].filter(Boolean),
};

export default config;
