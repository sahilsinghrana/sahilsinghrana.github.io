export function getSmallestImageFromSpotifyImagesArray(images = []) {
  return images
    .filter((img) => img.height > 50)
    .sort((a, b) => a.height - b.height)
    .at(0);
}

export function minMax(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
