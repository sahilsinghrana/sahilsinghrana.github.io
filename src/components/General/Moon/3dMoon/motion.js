// Shared by the logo transition and scene without eagerly importing Three.js.
export const TARGET_ETCHED_OPACITY = 0.72;

// Uses the scene's active time, so loading and visibility pauses cannot skip it.
export function createMoonPhaseIntro(target, applyPhase) {
  const targetPhase =
    typeof target === "string"
      ? parseFloat(target.replace("%", "")) / 100
      : target;
  let start = null;
  let complete = false;

  return {
    update(elapsedSeconds, reducedMotion = false) {
      if (complete) return;
      if (start === null) start = elapsedSeconds;
      const t = Math.max(0, Math.min(1, (elapsedSeconds - start - 0.3) / 4));
      if (reducedMotion || t >= 1) {
        // Use the original input for the exact existing steady-state result.
        applyPhase(target);
        complete = true;
        return;
      }
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      applyPhase(0.5 + (targetPhase - 0.5) * eased);
    },
  };
}

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
