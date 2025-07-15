export function getSmallestImageFromSpotifyImagesArray(images = []) {
  return images
    .filter((img) => img.height > 50)
    .sort((a, b) => a.height - b.height)
    .at(0);
}

export function minMax(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getRandom(min, max, step = 1) {
  const precision = 1 / step;
  const steps = Math.floor((max - min) * precision + 1);
  const randomStep = Math.floor(Math.random() * steps);
  const value = min + randomStep * step;
  return Math.round(value * precision) / precision;
}
