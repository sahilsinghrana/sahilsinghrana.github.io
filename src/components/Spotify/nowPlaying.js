import { fetchCurrentPlayerStatus } from "src/scripts/fetchers";
import { fillNowPlaying } from "./helpers/handlers";

async function fetchAndFillNowPlaying() {
  clearTimeout(window.topSongsTimeout);
  try {
    fillNowPlaying(await fetchCurrentPlayerStatus());
  } catch (err) {
    console.error(err);
  } finally {
    window.topSongsTimeout = setTimeout(fetchAndFillNowPlaying, 60000);
  }
}

fetchAndFillNowPlaying();
