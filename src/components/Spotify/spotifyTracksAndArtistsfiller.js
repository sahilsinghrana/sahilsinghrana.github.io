import TopTracksDom from "./helpers/CurrentTopTracksDom";
import { fetchTopTracksAndArtists } from "src/scripts/fetchers";

const spotifyLogoAnchorEl = document.querySelector(
  "body > main > div > div.spotifyData > div > a.spotifyLogoContainer",
);

function populateTopArtists(topArtists = []) {
  const topArtistContainer = document.querySelector(
    "body > main > div > div.spotifyData > div > div.topArtistsContainer > ul",
  );

  topArtistContainer.innerHTML = "";

  topArtists.forEach((artist = {}) => {
    const { images, external_urls, name } = artist;

    const li = document.createElement("li");
    const img = document.createElement("img");
    const h4 = document.createElement("h4");
    const a = document.createElement("a");

    li.className = "card artistCard";
    img.src = images[1]?.url || images[0]?.url;

    a.href = external_urls?.spotify;
    a.target = "_blank";

    h4.innerText = name;
    a.appendChild(h4);

    li.appendChild(img);
    li.appendChild(a);
    topArtistContainer?.appendChild(li);
  });
}

function populateTopTracks(topTracks = []) {
  TopTracksDom.clear();
  topTracks.forEach((track = {}) => TopTracksDom.addTrack(track));
}

fetchTopTracksAndArtists()
  .then((res) => {
    const { myProfile, artists, tracks } = res;
    populateTopArtists(artists);
    populateTopTracks(tracks);
    spotifyLogoAnchorEl.href = myProfile?.external_urls?.spotify;
  })
  .catch((err) => {
    console.log(err);
  });
