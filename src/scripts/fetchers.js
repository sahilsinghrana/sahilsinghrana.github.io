import { API_URLS } from "@utils/constants";

export async function fetchCurrentPlayerStatus() {
  return fetch(API_URLS.currentPlayerStatus).then((res) => res.json());
}

export async function fetchTopTracksAndArtists() {
  return fetch(API_URLS.topSpotifySongsAndTracks).then((res) => res.json());
}
