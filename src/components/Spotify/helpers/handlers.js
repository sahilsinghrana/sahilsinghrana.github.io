import CurrentTopArtistsDom from "./CurrentTopArtistsDom";
import TopTracksDom from "./CurrentTopTracksDom";
import { NowPlayingDom } from "./NowPlayingDom";

export function populateNowPlaying(currentPlayerStatus = {}) {
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

  NowPlayingDom.vinyl.updateImage(images, songTitle);
  NowPlayingDom.vinyl.spin();

  NowPlayingDom.artists.clear();
  artists?.forEach((artist) => NowPlayingDom.artists.add(artist));
}

export function populateTopArtists(topArtists = []) {
  if (!topArtists.length) {
    CurrentTopArtistsDom.hide();
    return;
  }
  CurrentTopArtistsDom.clear();
  CurrentTopArtistsDom.show();
  topArtists.forEach((artist = {}) => CurrentTopArtistsDom.addArtist(artist));
}

export function populateTopTracks(topTracks = []) {
  TopTracksDom.clear();
  if (!topTracks.length) {
    TopTracksDom.hide();
    return;
  }
  TopTracksDom.show();
  topTracks.forEach((track = {}) => TopTracksDom.addTrack(track));
}

export function addProfileLinkToSpotifyLogo(url) {
  const spotifyLogoAnchorEl = document.querySelector(
    "body > main > div > div.spotifyData > div > a.spotifyLogoContainer",
  );

  spotifyLogoAnchorEl.href = url;
}
