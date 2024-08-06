const previewAudioEl = new Audio();

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
  const topTracksContainer = document.querySelector(
    "body > main > div > div.spotifyData > div.topTrackAndArtistContainer > div.topTracksContainer > ul",
  );
  topTracksContainer.innerHTML = "";

  topTracks.forEach((track = {}) => {
    const { album = {}, name, external_urls, artists, preview_url } = track;
    const { images = [] } = album;
    const cardContainerEl = document.createElement("li");
    const coverArtEl = document.createElement("img");

    const songTitleEl = document.createElement("h4");
    const songTitleContainerEl = document.createElement("a");

    const metaDiv = document.createElement("div");

    const artistContainer = document.createElement("span");

    artists.forEach((artist, index) => {
      artistContainer.innerText = artistContainer.innerText.concat(
        artist.name,
        artists.length - 1 !== index ? ", " : "",
      );
    });

    cardContainerEl.className = "card trackCard";
    coverArtEl.src = images[1]?.url || images[0]?.url;

    if (preview_url) {
      coverArtEl.classList.add("hasPreview");
      coverArtEl.addEventListener("click", () => {
        if (previewAudioEl.src === preview_url && !previewAudioEl.paused) {
          coverArtEl.classList.remove("playing");
          previewAudioEl.pause();
          return;
        }
        previewAudioEl.src = preview_url;
        coverArtEl.classList.add("playing");
        previewAudioEl.play();
      });
    }

    songTitleContainerEl.href = external_urls?.spotify;
    songTitleContainerEl.target = "_blank";

    songTitleEl.innerText = name;
    songTitleContainerEl.appendChild(songTitleEl);
    metaDiv.appendChild(songTitleContainerEl);
    metaDiv.appendChild(artistContainer);

    cardContainerEl.appendChild(coverArtEl);
    cardContainerEl.appendChild(metaDiv);
    topTracksContainer?.appendChild(cardContainerEl);
  });
}

fetch("https://mytopsongs.sahilsinghrana.workers.dev/")
  .then((res) => res.json())
  .then((res) => {
    const { myProfile, artists, tracks } = res;
    populateTopArtists(artists);
    populateTopTracks(tracks);
    spotifyLogoAnchorEl.href = myProfile?.external_urls?.spotify;
  })
  .catch((err) => {
    console.log(err);
  });
