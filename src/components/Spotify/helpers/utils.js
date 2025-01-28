export function getSmallestImageFromSpotifyImagesArray(images = []) {
  return images
    .filter((img) => img.height > 50)
    .sort((a, b) => a.height - b.height)
    .at(0);
}
