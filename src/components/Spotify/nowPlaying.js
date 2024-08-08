import { fetchCurrentPlayerStatus, NowPlayingDom } from "./helpers";

function main() {
  fetchCurrentPlayerStatus()
    .then(fillNowPlaying)
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      clearInterval(window.topSongsFetchInterval);
      window.topSongsFetchInterval = setInterval(
        () =>
          fetchCurrentPlayerStatus()
            .then(fillNowPlaying)
            .catch((err) => {
              console.log(err);
            }),
        60000,
      );
    });
}

function fillNowPlaying(currentPlayerStatus = {}) {
  const { is_playing, item = {} } = currentPlayerStatus;
  const { name: songTitle, artists, external_urls, album = {} } = item;
  const { images } = album;

  if (!is_playing) {
    NowPlayingDom.hideNowPlayingWrapper();
    NowPlayingDom.showNotPlayingWrapper();

    NowPlayingDom.vinyl.stopSpin();
    return;
  }

  NowPlayingDom.showNowPlayingWrapper();
  NowPlayingDom.hideNotPlayingWrapper();

  NowPlayingDom.title.setTitle(songTitle);
  NowPlayingDom.title.setLink(external_urls.spotify);

  NowPlayingDom.vinyl.updateImage(images);
  NowPlayingDom.vinyl.spin();

  NowPlayingDom.artists.clear();
  artists?.forEach((artist) => NowPlayingDom.artists.add(artist));
}

main();
