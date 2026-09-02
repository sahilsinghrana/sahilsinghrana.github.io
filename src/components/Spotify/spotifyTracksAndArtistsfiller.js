import { fetchTopTracksAndArtists } from "src/scripts/fetchers";
import {
  addProfileLinkToSpotifyLogo,
  populateTopArtists,
  populateTopTracks,
} from "./helpers/handlers";
import {
  showTopPanelsError,
  showTopPanelsLoading,
  wireTopPanelRetryButtons,
} from "./helpers/SpotifyPanelState";

let fetchGeneration = 0;
let abortController = null;

function stopFetch() {
  abortController?.abort();
  abortController = null;
}

async function populateTopTracksAndArtists() {
  const generation = ++fetchGeneration;
  stopFetch();
  abortController = new AbortController();
  const { signal } = abortController;

  showTopPanelsLoading();

  try {
    const res = await fetchTopTracksAndArtists(signal);
    if (generation !== fetchGeneration || signal.aborted) return;

    const { myProfile, artists, tracks } = res;

    addProfileLinkToSpotifyLogo(myProfile?.external_urls?.spotify);

    populateTopArtists(artists);
    populateTopTracks(tracks);
  } catch (err) {
    if (err?.name === "AbortError") return;
    console.error(err);
    if (generation !== fetchGeneration || signal.aborted) return;
    showTopPanelsError();
  }
}

function onPageHide() {
  fetchGeneration += 1;
  stopFetch();
}

function onPageShow(event) {
  if (event.persisted) {
    populateTopTracksAndArtists();
  }
}

window.addEventListener("pagehide", onPageHide);
window.addEventListener("pageshow", onPageShow);

wireTopPanelRetryButtons(populateTopTracksAndArtists);
populateTopTracksAndArtists();
