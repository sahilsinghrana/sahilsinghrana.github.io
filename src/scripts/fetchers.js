import { API_URLS } from "@utils/apiUrls";

export async function fetchCurrentPlayerStatus(signal) {
  const res = await fetch(API_URLS.currentPlayerStatus, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`currentPlayerStatus failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchTopTracksAndArtists(signal) {
  const res = await fetch(API_URLS.topSpotifySongsAndTracks, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`topSpotifySongsAndTracks failed: ${res.status}`);
  }
  return res.json();
}
