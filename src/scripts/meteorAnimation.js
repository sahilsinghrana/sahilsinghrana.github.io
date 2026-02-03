import { getRandom } from "@components/Spotify/helpers/utils";

export function initMeteorAnimation() {
  const body = document.body;
  const meteorsFragment = document.createDocumentFragment();

  for (let i = 0; i <= 28; i++) {
    const meteorDiv = document.createElement("div");
    meteorDiv.className = "meteor";

    const spawnFromTop = Math.random() > 0.5;

    let left, top;

    if (spawnFromTop) {
      left = Math.floor(getRandom(-50, 100));
      top = -30;
      meteorDiv.style.top = top + "px";
      meteorDiv.style.left = left + "%";
    } else {
      left = -30;
      top = Math.floor(getRandom(0, 100));
      meteorDiv.style.left = left + "px";
      meteorDiv.style.top = top + "%";
    }

    const delay = i === 0 ? 0.4 : getRandom(0, 50).toFixed(2);
    const width = getRandom(45, 340);
    const height = getRandom(0.18, 3.1, 0.1);
    const duration = 20 - ((width - 45) / (340 - 45)) * (20 - 6);

    meteorDiv.style.setProperty("--duration", `${duration.toFixed(0)}s`);
    meteorDiv.style.setProperty("--width", `${width}px`);
    meteorDiv.style.setProperty("--height", `${height}px`);
    meteorDiv.style.setProperty("--delay", `${delay}s`);
    meteorDiv.style.setProperty(
      "--max-opacity",
      String(getRandom(0.35, 0.49, 0.01)),
    );

    meteorsFragment.appendChild(meteorDiv);
  }

  requestAnimationFrame(() => {
    body.appendChild(meteorsFragment);
  });
}
