const previewAudioEl = new Audio();

class TopTracksDom {
  static getWrapperEl() {
    return document.getElementById("topTracksListContainer");
  }

  static clear() {
    this.getWrapperEl().innerHTML = "";
  }

  static addTrack(track = {}) {
    const { album = {}, name, external_urls, artists, preview_url } = track;
    const { images = [] } = album;

    const trackCard = new TrackCard();

    artists.forEach((artist) => trackCard.addArtist(artist));

    trackCard.updateCoverArt(images, preview_url);
    trackCard.updateSongTitle(name, external_urls?.spotify);
    trackCard.apppendToDom(this.getWrapperEl());
  }
}

export default TopTracksDom;

class TrackCard {
  constructor() {
    this.createElements();
  }

  createElements() {
    this.cardContainerEl = document.createElement("li");
    this.cardContainerEl.className = "card trackCard";

    this.coverArtEl = document.createElement("img");
    this.songTitleEl = document.createElement("h4");
    this.songTitleContainerEl = document.createElement("a");
    this.metaDiv = document.createElement("div");
    this.artistContainer = document.createElement("span");
  }

  addArtist(artist = {}) {
    const isFirst = !this.artistContainer.innerText;
    this.artistContainer.innerText = this.artistContainer.innerText.concat(
      isFirst ? "" : ", ",
      artist.name,
    );
  }

  updateCoverArtPreviewUrl(previewUrl) {
    if (previewUrl) {
      this.coverArtEl.classList.add("hasPreview");
      this.coverArtEl.addEventListener("click", () => {
        if (previewAudioEl.src === previewUrl && !previewAudioEl.paused) {
          this.coverArtEl.classList.remove("playing");
          previewAudioEl.pause();
          return;
        }
        previewAudioEl.src = previewUrl;
        this.coverArtEl.classList.add("playing");
        previewAudioEl.play();
      });
    }
  }

  updateCoverArt(images = [], previewUrl) {
    this.coverArtEl.src = images[1]?.url || images[0]?.url;
    this.updateCoverArtPreviewUrl(previewUrl);
  }

  updateSongTitle(title, link) {
    this.songTitleEl.innerText = title;
    if (link) {
      this.songTitleContainerEl.href = link;
      this.songTitleContainerEl.target = "_blank";
    }
  }

  apppendToDom(container) {
    this.songTitleContainerEl.appendChild(this.songTitleEl);
    this.metaDiv.appendChild(this.songTitleContainerEl);
    this.metaDiv.appendChild(this.artistContainer);

    this.cardContainerEl.appendChild(this.coverArtEl);
    this.cardContainerEl.appendChild(this.metaDiv);
    container.appendChild(this.cardContainerEl);
  }
}
