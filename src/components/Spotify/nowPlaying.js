const notPlayingMessageEl = document.querySelector(
  "body > main > div > div.spotifyData > div > div.notPlaying",
);
const nowPlayingInfoEl = document.querySelector(
  "body > main > div > div.spotifyData > div > div.nowPlayingInfo",
);
const songTitleEl = document.querySelector("#nowPlayingTitle");
const artistsEl = document.querySelector("#nowPlayingArtists");

const trackVinylEl = document.querySelector(
  "body > main > div > div.spotifyData > div > div.trackVinyl",
);

nowPlayingInfoEl?.classList.add("displayNone");

function fillNowPlaying(currentPlayerStatus = {}) {
  const { is_playing, item } = currentPlayerStatus;
  if (!is_playing) {
    notPlayingMessageEl?.classList.remove("displayNone");
    nowPlayingInfoEl?.classList.add("displayNone");
    trackVinylEl?.classList.remove("spinVinyl");
    return;
  }
  nowPlayingInfoEl?.classList.remove("displayNone");
  notPlayingMessageEl?.classList.add("displayNone");

  const { name: songTitle, artists = [], external_urls, album = {} } = item;

  songTitleEl.innerHTML = songTitle;
  songTitleEl.href = external_urls.spotify;
  songTitleEl.target = "_blank";

  artistsEl.innerHTML = "";

  const { images = [] } = album;
  trackVinylEl?.classList.add("spinVinyl");
  trackVinylEl.style.backgroundImage = `url('${images[1]?.url || images[0]?.url}')`;

  artists.forEach((artist = {}, idx) => {
    const { name = "", external_urls } = artist;
    const newArtistEl = document.createElement("a");
    newArtistEl.innerText = name + (idx === artists.length - 1 ? "" : ", ");
    newArtistEl.href = external_urls.spotify;
    newArtistEl.target = "_blank";
    artistsEl?.append(newArtistEl);
  });
}
fetch("https://mytopsongs.sahilsinghrana.workers.dev/currentPlaying")
  .then((res) => res.json())
  .then(fillNowPlaying)
  .catch((err) => {
    console.log(err);
  })
  .finally(() => {
    clearInterval(window.topSongsFetchInterval);
    window.topSongsFetchInterval = setInterval(
      () =>
        fetch("https://mytopsongs.sahilsinghrana.workers.dev/currentPlaying")
          .then((res) => res.json())
          .then(fillNowPlaying)
          .catch((err) => {
            console.log(err);
          }),
      60000,
    );
  });