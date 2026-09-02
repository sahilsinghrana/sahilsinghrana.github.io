import { hideElement, showElement } from "src/scripts/domHelpers";

function setPanelClass(containerEl, className, enabled) {
  if (!containerEl) return;
  containerEl.classList.toggle(className, enabled);
}

class TopPanelState {
  constructor(containerId, loadingId, errorId, listId) {
    this.containerId = containerId;
    this.loadingId = loadingId;
    this.errorId = errorId;
    this.listId = listId;
  }

  getContainerEl() {
    return document.getElementById(this.containerId);
  }

  getLoadingEl() {
    return document.getElementById(this.loadingId);
  }

  getErrorEl() {
    return document.getElementById(this.errorId);
  }

  getListEl() {
    return document.getElementById(this.listId);
  }

  showLoading() {
    hideElement(this.getErrorEl());
    hideElement(this.getListEl());
    showElement(this.getLoadingEl());
    setPanelClass(this.getContainerEl(), "isLoading", true);
    setPanelClass(this.getContainerEl(), "isError", false);
  }

  showContent() {
    hideElement(this.getLoadingEl());
    hideElement(this.getErrorEl());
    showElement(this.getListEl());
    setPanelClass(this.getContainerEl(), "isLoading", false);
    setPanelClass(this.getContainerEl(), "isError", false);
  }

  showError() {
    hideElement(this.getLoadingEl());
    hideElement(this.getListEl());
    showElement(this.getErrorEl());
    setPanelClass(this.getContainerEl(), "isLoading", false);
    setPanelClass(this.getContainerEl(), "isError", true);
  }

  hideAll() {
    hideElement(this.getLoadingEl());
    hideElement(this.getErrorEl());
    hideElement(this.getListEl());
    setPanelClass(this.getContainerEl(), "isLoading", false);
    setPanelClass(this.getContainerEl(), "isError", false);
  }
}

export const topTracksPanelState = new TopPanelState(
  "topTracksContainer",
  "topTracksLoading",
  "topTracksError",
  "topTracksListContainer",
);

export const topArtistsPanelState = new TopPanelState(
  "topArtistsContainer",
  "topArtistsLoading",
  "topArtistsError",
  "topArtistsListContainer",
);

export function showTopPanelsLoading() {
  topTracksPanelState.showLoading();
  topArtistsPanelState.showLoading();
}

export function showTopPanelsError() {
  topTracksPanelState.showError();
  topArtistsPanelState.showError();
}

export function wireTopPanelRetryButtons(onRetry) {
  document.querySelectorAll(".spotifyRetryBtn").forEach((button) => {
    button.addEventListener("click", onRetry);
  });
}
