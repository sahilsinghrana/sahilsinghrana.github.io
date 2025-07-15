import { fetchCurrentPlayerStatus } from "src/scripts/fetchers";
import { populateNowPlaying } from "./helpers/handlers";

async function fetchAndFillNowPlaying() {
  clearTimeout(window.topSongsTimeout);

  try {
    populateNowPlaying(await fetchCurrentPlayerStatus());
  } catch (err) {
    console.error(err);
  } finally {
    window.topSongsTimeout = setTimeout(fetchAndFillNowPlaying, 30000);
  }
}

fetchAndFillNowPlaying();
