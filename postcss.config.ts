// @ts-nocheck
module.exports = {
  plugins: [
    require("postcss-import"),
    require("postcss-url"),
    require("postcss-color-rgba-fallback"),
    require("postcss-combine-media-query"),
    require("postcss-combine-duplicated-selectors")({
      removeDuplicatedProperties: false,
      removeDuplicatedValues: true,
    }),
    require("autoprefixer"),
    require("cssnano")({ preset: "advanced" }),
    require("postcss-reporter"),
  ],
};
