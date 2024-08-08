import { fillNowPlaying } from "./helpers/handlers";
import { fetchCurrentPlayerStatus } from "./helpers/NowPlayingDom";

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
