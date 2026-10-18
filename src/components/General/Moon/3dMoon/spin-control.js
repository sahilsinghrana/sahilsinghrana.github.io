// DOM-only control; the existing render loop remains responsible for rotation.
export function createSpinControl(button, reducedMotionQuery) {
  let userPaused = false;
  let disposed = false;
  const view = button.ownerDocument?.defaultView;
  const viewport = view?.visualViewport;
  button.hidden = true;

  const position = () => {
    if (disposed || button.hidden || !view) return;
    const rect = button.parentElement.getBoundingClientRect();
    const viewportBottom = viewport
      ? viewport.offsetTop + viewport.height
      : view.innerHeight;
    const inset = Math.min(
      Math.max(10, rect.height - 54),
      Math.max(10, rect.bottom - viewportBottom + 10),
    );
    button.style.bottom = `${inset}px`;
    button.style.visibility =
      Math.min(rect.bottom, viewportBottom) -
        Math.max(rect.top, viewport?.offsetTop || 0) >=
      54
        ? ""
        : "hidden";
  };

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
  view?.addEventListener("resize", position, { passive: true });
  viewport?.addEventListener("resize", position, { passive: true });
  viewport?.addEventListener("scroll", position, { passive: true });
  sync();

  return {
    button,
    get paused() {
      return reducedMotionQuery.matches || userPaused;
    },
    reveal() {
      if (!disposed) {
        button.hidden = false;
        position();
      }
    },
    position,
    dispose() {
      if (disposed) return;
      disposed = true;
      button.hidden = true;
      button.removeEventListener("click", toggle);
      reducedMotionQuery.removeEventListener("change", sync);
      view?.removeEventListener("resize", position);
      viewport?.removeEventListener("resize", position);
      viewport?.removeEventListener("scroll", position);
    },
  };
}
