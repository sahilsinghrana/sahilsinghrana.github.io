import { fetchCurrentPlayerStatus } from "src/scripts/fetchers";
import { populateNowPlaying } from "./helpers/handlers";
import { NowPlayingDom } from "./helpers/NowPlayingDom";

let pollGeneration = 0;
let abortController = null;
let hasReceivedFirstResponse = false;

function stopPolling() {
  clearTimeout(window.topSongsTimeout);
  window.topSongsTimeout = undefined;
  abortController?.abort();
  abortController = null;
}

async function fetchAndFillNowPlaying() {
  clearTimeout(window.topSongsTimeout);

  const generation = ++pollGeneration;
  abortController?.abort();
  abortController = new AbortController();
  const { signal } = abortController;

  if (!hasReceivedFirstResponse) {
    NowPlayingDom.showLoading();
  }

  try {
    const status = await fetchCurrentPlayerStatus(signal);
    if (generation !== pollGeneration || signal.aborted) return;

    if (!hasReceivedFirstResponse) {
      hasReceivedFirstResponse = true;
    }

    populateNowPlaying(status);
  } catch (err) {
    if (err?.name === "AbortError") return;
    console.error(err);

    if (generation !== pollGeneration || signal.aborted) return;

    if (!hasReceivedFirstResponse) {
      hasReceivedFirstResponse = true;
      NowPlayingDom.showNotPlayingWrapper();
    }
  } finally {
    // Aborted/superseded runs must not keep the 5s loop alive.
    if (generation !== pollGeneration || signal.aborted) return;
    window.topSongsTimeout = setTimeout(fetchAndFillNowPlaying, 5000);
  }
}

function onPageHide() {
  // Bump first so an in-flight finally cannot reschedule after abort.
  pollGeneration += 1;
  stopPolling();
}

function onPageShow(event) {
  // Initial load already starts via fetchAndFillNowPlaying() below.
  // Only restart when the page is restored from bfcache.
  if (event.persisted) {
    hasReceivedFirstResponse = false;
    fetchAndFillNowPlaying();
  }
}

window.addEventListener("pagehide", onPageHide);
window.addEventListener("pageshow", onPageShow);

fetchAndFillNowPlaying();
