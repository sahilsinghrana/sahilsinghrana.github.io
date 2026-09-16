import { getRandom } from "@components/Spotify/helpers/utils";

export const RANDOM_CONTENT_STORAGE_KEYS = {
  shloka: "q7",
  moonFact: "m4",
} as const;

function getStoredRandomIndex(key: string, itemCount: number): number | null {
  if (typeof window === "undefined" || itemCount <= 0) return null;

  try {
    const value = Number.parseInt(window.localStorage.getItem(key) || "", 10);
    return Number.isInteger(value) && value >= 0 && value < itemCount
      ? value
      : null;
  } catch {
    return null;
  }
}

export function getRandomContentIndex(key: string, itemCount: number): number {
  if (itemCount <= 0) return 0;

  const lastIndex = getStoredRandomIndex(key, itemCount);
  let randomIndex = getRandom(0, itemCount - 1);

  while (lastIndex !== null && randomIndex === lastIndex && itemCount > 1) {
    randomIndex = getRandom(0, itemCount - 1);
  }

  try {
    window.localStorage.setItem(key, String(randomIndex));
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  return randomIndex;
}
