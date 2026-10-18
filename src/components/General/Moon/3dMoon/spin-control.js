// DOM-only control; the existing render loop remains responsible for rotation.
export function createSpinControl(button, reducedMotionQuery) {
  let userPaused = false;
  let disposed = false;
  button.hidden = true;

  const sync = () => {
    const reduced = reducedMotionQuery.matches;
    const label = reduced
      ? "Moon auto-spin disabled by reduced motion"
      : userPaused
        ? "Resume Moon auto-spin"
        : "Pause Moon auto-spin";
    button.disabled = reduced;
    button.dataset.paused = String(reduced || userPaused);
    button.setAttribute("aria-label", label);
    button.title = label;
  };
  const toggle = () => {
    if (disposed || reducedMotionQuery.matches) return;
    userPaused = !userPaused;
    sync();
  };
  button.addEventListener("click", toggle);
  reducedMotionQuery.addEventListener("change", sync);
  sync();

  return {
    button,
    get paused() {
      return reducedMotionQuery.matches || userPaused;
    },
    reveal() {
      if (!disposed) button.hidden = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      button.hidden = true;
      button.removeEventListener("click", toggle);
      reducedMotionQuery.removeEventListener("change", sync);
    },
  };
}
