import { getSmallestImageFromSpotifyImagesArray } from "./utils";

class ArtistCard {
  static createArtistCard(artist = {}) {
    const { images, external_urls, name } = artist;

    const li = document.createElement("li");
    const img = document.createElement("img");
    const h4 = document.createElement("h4");
    const a = document.createElement("a");

    li.className = "card artistCard";
    img.src = getSmallestImageFromSpotifyImagesArray(images)?.url;
    img.alt = name;

    a.href = external_urls?.spotify;
    a.target = "_blank";

    h4.innerText = name;
    a.appendChild(h4);

    li.appendChild(img);
    li.appendChild(a);

    return li;
  }
}

class CurrentTopArtistsDom {
  static getWrapperEl() {
    return document.querySelector(
      "body > main > div > div.spotifyData > div > div.topArtistsContainer > ul",
    );
  }

  static getContainerEl() {
    return document.querySelector(
      "body > main > div > div.spotifyData > div > div.topArtistsContainer",
    );
  }

  static clear() {
    this.getWrapperEl().innerHTML = "";
  }

  static hide() {
    this.getContainerEl().style = "display: none;";
  }

  static show() {
    this.getWrapperEl().style = "";
  }

  static addArtist(artist) {
    const artistCard = ArtistCard.createArtistCard(artist);
    this.getWrapperEl()?.appendChild(artistCard);
  }
}

export default CurrentTopArtistsDom;
