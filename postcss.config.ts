const isProd = process.env.NODE_ENV === "production";

module.exports = {
  map: isProd ? false : { inline: true },

  plugins: [
    require("postcss-import"),
    require("postcss-flexbugs-fixes")(),
    require("postcss-url")({
      url: "inline",
      maxSize: 10,
      fallback: "copy",
    }),
    require("postcss-combine-duplicated-selectors")({
      removeDuplicatedProperties: false,
      removeDuplicatedValues: true,
    }),
    require("postcss-preset-env")({
      stage: 3,
      features: {
        "nesting-rules": true,
        "custom-properties": true,
      },
      autoprefixer: { grid: true },
      preserve: false,
    }),

    require("autoprefixer"),
    require("cssnano")({ preset: "advanced" }),
    require("postcss-reporter")({
      clearReportedMessages: true,
      throwError: false,
    }),
  ].filter(Boolean),
};
