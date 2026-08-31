import { getRandom } from "@components/Spotify/helpers/utils";

export function initMeteorAnimation() {
  const body = document.body;
  if (body.querySelector(".meteor")) return;

  const meteorsFragment = document.createDocumentFragment();

  for (let i = 0; i <= 35; i++) {
    const meteorDiv = document.createElement("div");
    meteorDiv.className = "meteor";

    const delay = i < 2 ? 0.4 : getRandom(-15, 50).toFixed(2);
    const width = getRandom(48, 350);
    const height = getRandom(0.15, 3.1, 0.1);
    const duration = 20 - ((width - 48) / (350 - 48)) * (20 - 5);

    meteorDiv.style.setProperty("--duration", `${duration.toFixed(0)}s`);
    meteorDiv.style.setProperty("--width", `${width}px`);
    meteorDiv.style.setProperty("--height", `${height}px`);
    meteorDiv.style.setProperty("--delay", `${delay}s`);
    meteorDiv.style.setProperty(
      "--max-opacity",
      String(getRandom(0.3, 0.75, 0.01)),
    );

    const spawnFromTop = Math.random() > 0.5;

    let left, top;

    if (spawnFromTop) {
      left = Math.floor(getRandom(-25, 90));
      top = 0 - width;
      meteorDiv.style.top = top + "px";
      meteorDiv.style.left = left + "%";
    } else {
      left = 0 - width;
      meteorDiv.style.left = left + "px";

      top = Math.floor(getRandom(-10, 90));
      meteorDiv.style.top = top + "%";
    }

    meteorsFragment.appendChild(meteorDiv);
  }

  requestAnimationFrame(() => {
    body.appendChild(meteorsFragment);
  });
}
