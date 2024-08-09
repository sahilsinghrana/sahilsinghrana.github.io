import { hideElement, showElement } from "src/scripts/domHelpers";

class NowPlayingVinyl {
  static getVinylEl() {
    return document.getElementById("nowPlayingTrackVinyl");
  }

  static spin() {
    this.getVinylEl()?.classList.add("spinVinyl");
  }

  static stopSpin() {
    this.getVinylEl()?.classList.remove("spinVinyl");
  }

  static updateImage(images = [], alt) {
    this.getVinylEl().style.backgroundImage = `url('${images[1]?.url || images[0]?.url}')`;
    this.getVinylEl().alt = alt;
  }
}

class NowPlayingArtists {
  static createArtistEl(artist = {}) {
    const { name = "", external_urls } = artist;

    const artistEl = document.createElement("a");

    artistEl.innerText = name;
    artistEl.href = external_urls.spotify;
    artistEl.target = "_blank";

    return artistEl;
  }

  static getContainerEl() {
    return document.getElementById("nowPlayingArtists");
  }

  static clear() {
    this.getContainerEl().innerHTML = "";
  }

  static add(artist = {}) {
    const containerEl = this.getContainerEl();
    const isFirst = containerEl.innerHTML === "";

    if (!isFirst) {
      containerEl.innerHTML = containerEl.innerHTML.concat(", ");
    }

    const artistEl = this.createArtistEl(artist);
    containerEl?.append(artistEl);
  }
}

class NowPlayingSongTitle {
  static getEl() {
    return document.getElementById("nowPlayingTitle");
  }

  static setTitle(songTitle) {
    const titleEl = this.getEl();
    titleEl.innerHTML = songTitle;
    titleEl.target = "_blank";
  }

  static setLink(link) {
    const titleEl = this.getEl();
    titleEl.href = link;
    titleEl.target = "_blank";
  }
}

export class NowPlayingDom {
  static vinyl = NowPlayingVinyl;
  static artists = NowPlayingArtists;
  static title = NowPlayingSongTitle;

  static getNotPlayingMessageWrapperEl() {
    return document.getElementById("notPlayingWrap");
  }

  static getNowPlayingWrapper() {
    return document.getElementById("nowPlayingInfo");
  }

  static hideNowPlayingWrapper() {
    hideElement(this.getNowPlayingWrapper());
  }

  static hideNotPlayingWrapper() {
    hideElement(this.getNotPlayingMessageWrapperEl());
  }

  static showNowPlayingWrapper() {
    showElement(this.getNowPlayingWrapper());
  }

  static showNotPlayingWrapper() {
    showElement(this.getNotPlayingMessageWrapperEl());
  }
}
