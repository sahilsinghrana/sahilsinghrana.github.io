// Shared by the logo transition and scene without eagerly importing Three.js.
export const TARGET_ETCHED_OPACITY = 0.72;

export function createAnimationClock() {
  let previous = null;
  let elapsed = 0;
  return {
    get elapsed() {
      return elapsed;
    },
    tick(timestamp) {
      const delta =
        previous === null
          ? 0
          : Math.max(0, Math.min(0.05, (timestamp - previous) / 1000));
      previous = timestamp;
      elapsed += delta;
      return delta;
    },
    pause() {
      previous = null;
    },
    reset() {
      previous = null;
      elapsed = 0;
    },
  };
}
