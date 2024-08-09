import { fetchTopTracksAndArtists } from "src/scripts/fetchers";
import {
  addProfileLinkToSpotifyLogo,
  populateTopArtists,
  populateTopTracks,
} from "./helpers/handlers";

async function populateTopTracksAndArtists() {
  try {
    const res = await fetchTopTracksAndArtists();

    const { myProfile, artists, tracks } = res;

    addProfileLinkToSpotifyLogo(myProfile?.external_urls?.spotify);

    populateTopArtists(artists);
    populateTopTracks(tracks);
  } catch (err) {
    console.error(err);
  }
}

populateTopTracksAndArtists();
