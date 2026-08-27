import { fetchCurrentPlayerStatus } from "src/scripts/fetchers";
import { populateNowPlaying } from "./helpers/handlers";

let pollGeneration = 0;
let abortController = null;

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

  try {
    const status = await fetchCurrentPlayerStatus(signal);
    if (generation !== pollGeneration || signal.aborted) return;
    populateNowPlaying(status);
  } catch (err) {
    if (err?.name === "AbortError") return;
    console.error(err);
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
    fetchAndFillNowPlaying();
  }
}

window.addEventListener("pagehide", onPageHide);
window.addEventListener("pageshow", onPageShow);

fetchAndFillNowPlaying();
