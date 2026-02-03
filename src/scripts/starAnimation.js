import { getRandom } from "@components/Spotify/helpers/utils";

export function initStarAnimation() {
  const starsFragment = document.createDocumentFragment();

  for (let i = 0; i < 11; i++) {
    const star = document.createElement("div");
    star.className = "star";

    const animationDuration = getRandom(4, 10, 0.1);
    const animationDelay = getRandom(1, 14);

    star.style.animationDuration = animationDuration + "s";
    star.style.animationDelay = animationDelay + "s";
    star.style.setProperty("--max-opacity", String(getRandom(0.3, 1, 0.1)));

    star.style.top = getRandom(0, 100, 1) + "vh";
    star.style.left = getRandom(0, 100, 1) + "vw";

    starsFragment.appendChild(star);
  }

  requestAnimationFrame(() => {
    document.body.appendChild(starsFragment);
  });
}
