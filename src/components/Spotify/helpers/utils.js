export function getSmallestImageFromSpotifyImagesArray(images = []) {
  return images
    .filter((img) => img.height > 50)
    .sort((a, b) => a.height - b.height)
    .at(0);
}

export function minMax(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getRandomFallback(min, max, step = 1) {
  const precision = 1 / step;
  const totalSteps = Math.floor((max - min) * precision) + 1;

  const randomStep = Math.floor(Math.random() * totalSteps);
  const value = min + randomStep * step;

  return Math.round(value * precision) / precision;
}

export function getRandom(min, max, step = 1) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function" &&
    step > 0 &&
    max > min
  ) {
    const precision = 1 / step;
    const totalSteps = Math.floor((max - min) * precision) + 1;

    if (totalSteps <= 0 || !isFinite(totalSteps)) {
      return getRandomFallback(min, max, step);
    }

    // Determine how many bytes are needed
    const maxRandom = totalSteps - 1;
    const byteCount = Math.ceil(Math.log2(maxRandom + 1) / 8);
    const maxRange = 2 ** (byteCount * 8);
    const maxValid = Math.floor(maxRange / totalSteps) * totalSteps;

    const randomBytes = new Uint8Array(byteCount);
    let randomValue;
    let attempts = 0;

    do {
      crypto.getRandomValues(randomBytes);
      randomValue = 0;
      for (let i = 0; i < byteCount; i++) {
        randomValue = (randomValue << 8) | randomBytes[i];
      }

      if (++attempts > 1000) {
        return getRandomFallback(min, max, step); // Prevent infinite loop
      }
    } while (randomValue >= maxValid);

    const randomStep = randomValue % totalSteps;
    const value = min + randomStep * step;

    return Math.round(value * precision) / precision;
  }

  return getRandomFallback(min, max, step);
}
