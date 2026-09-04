/** @typedef {'collapsed' | 'expanded' | 'anchored'} LayoutMode */

/** Keep in sync with portfoliochat2/src/config/chat/shared.ts IFRAME_HEIGHT */
export const IFRAME_HEIGHT = {
  collapsed: 62,
  defaultExpanded: 450,
  expandedMin: 300,
  expandedViewportRatio: 0.65,
  visibleHeightOffset: 12,
  widgetViewportPadding: 8,
  max: 600,
  min: 62,
};

const INSTANT_RESIZE_DEBOUNCE_MS = 50;

// How long to suppress visualViewport "scroll" events caused by our own
// window.scrollBy() calls inside pinHeaderToViewport / fitBottomIfSafe,
// preventing a re-entrant applyLayout() triggered by self-scroll.
const SELF_SCROLL_SUPPRESS_MS = 220;

/**
 * @param {HTMLIFrameElement | null} iframe
 * @param {HTMLElement | null} container
 */
export function createEmbedLayoutController(iframe, container) {
  const allowedOrigin = iframe ? new URL(iframe.src).origin : "";

  let isExpanded = false;
  let inputFocused = false;
  let layoutGeneration = 0;
  let instantResizeTimer;
  let viewportResizeTimer = 0;

  let suppressScrollEventsUntil = 0;

  // Baseline viewport height corresponding to "no keyboard visible."
  // Initialized on attach and only ever grown while !inputFocused, so it
  // self-corrects for Safari URL bar show/hide as well.
  let keyboardClosedBaseline = 0;

  const getViewport = () => window.visualViewport;

  const getVisibleHeight = () => getViewport()?.height ?? window.innerHeight;

  /** @returns {LayoutMode} */
  const getMode = () => {
    if (!isExpanded) return "collapsed";
    if (inputFocused) return "anchored";
    return "expanded";
  };

  const getViewportBounds = () => {
    const viewport = getViewport();
    if (!viewport) return null;

    const padding = IFRAME_HEIGHT.widgetViewportPadding;
    return {
      top: viewport.offsetTop + padding,
      bottom: viewport.offsetTop + viewport.height - padding,
    };
  };

  const getMaxFitHeight = () => {
    if (!iframe) return IFRAME_HEIGHT.collapsed;

    const viewport = getViewport();
    const visibleTop = viewport?.offsetTop ?? 0;
    const visibleBottom = visibleTop + getVisibleHeight();
    const iframeTop = iframe.getBoundingClientRect().top;
    const spaceBelowTop = visibleBottom - iframeTop;

    return Math.max(IFRAME_HEIGHT.collapsed, Math.floor(spaceBelowTop));
  };

  const computeExpandedHeight = () => {
    const visibleHeight = getVisibleHeight();
    if (!Number.isFinite(visibleHeight) || visibleHeight <= 0) {
      return IFRAME_HEIGHT.defaultExpanded;
    }

    const ratioHeight = Math.floor(
      visibleHeight * IFRAME_HEIGHT.expandedViewportRatio,
    );
    const maxFit = getMaxFitHeight();

    return Math.min(
      Math.max(ratioHeight, IFRAME_HEIGHT.expandedMin),
      maxFit,
      visibleHeight - IFRAME_HEIGHT.visibleHeightOffset,
      IFRAME_HEIGHT.max,
    );
  };

  const computeHeight = () => {
    const mode = getMode();
    if (mode === "collapsed") return IFRAME_HEIGHT.collapsed;
    if (mode === "anchored") return getMaxFitHeight();
    return computeExpandedHeight();
  };

  // Grow the baseline whenever we're confident there's no keyboard up.
  // Never shrinks here — shrinking only happens via a fresh attach(), so a
  // real keyboard-open sequence never corrupts it.
  const maybeGrowBaseline = () => {
    if (inputFocused) return;
    const visible = getVisibleHeight();
    if (visible > keyboardClosedBaseline) {
      keyboardClosedBaseline = visible;
    }
  };

  const markSelfScroll = () => {
    suppressScrollEventsUntil = Date.now() + SELF_SCROLL_SUPPRESS_MS;
  };

  const isSuppressingScrollEvents = () => Date.now() < suppressScrollEventsUntil;

  const pinHeaderToViewport = (behavior = "instant") => {
    if (!iframe) return;

    const bounds = getViewportBounds();
    if (!bounds) return;

    const rect = iframe.getBoundingClientRect();
    const delta = rect.top - bounds.top;

    if (Math.abs(delta) >= 1) {
      markSelfScroll();
      window.scrollBy({ top: delta, behavior });
      return;
    }

    const afterScroll = iframe.getBoundingClientRect();
    if (Math.abs(afterScroll.top - bounds.top) >= 1) {
      markSelfScroll();
      container?.scrollIntoView({ block: "start", behavior });
    }
  };

  const fitBottomIfSafe = (behavior = "instant") => {
    if (!iframe) return;

    const bounds = getViewportBounds();
    if (!bounds) return;

    const rect = iframe.getBoundingClientRect();
    if (rect.bottom <= bounds.bottom) return;

    const overflow = rect.bottom - bounds.bottom;
    const headerTopAfterScroll = rect.top - overflow;
    if (headerTopAfterScroll < bounds.top) return;

    markSelfScroll();
    window.scrollBy({ top: overflow, behavior });
    pinHeaderToViewport(behavior);
  };

  const setInstantResize = (enabled) => {
    if (!iframe) return;

    if (enabled) {
      iframe.classList.add("selene-resize-instant");
      window.clearTimeout(instantResizeTimer);
      instantResizeTimer = window.setTimeout(() => {
        iframe?.classList.remove("selene-resize-instant");
      }, INSTANT_RESIZE_DEBOUNCE_MS);
      return;
    }

    iframe.classList.remove("selene-resize-instant");
  };

  const setEmbedActive = (active) => {
    container?.classList.toggle("selene-embed-active", active);
  };

  const applyHeight = (height) => {
    if (!iframe) return;
    iframe.style.height = `${height}px`;
  };

  const cancelStabilization = () => {
    // No-op: convergence loop removed. Kept as a safety call site in case
    // any in-flight rAF was scheduled before this call path was reached.
  };

  const applyCollapsedLayout = () => {
    cancelStabilization();
    setEmbedActive(false);
    setInstantResize(true);
    applyHeight(IFRAME_HEIGHT.collapsed);
    maybeGrowBaseline();
  };

  const applyAnchoredLayout = (scrollBehavior = "instant") => {
    cancelStabilization();
    setEmbedActive(true);
    setInstantResize(true);
    pinHeaderToViewport(scrollBehavior);
    applyHeight(computeHeight());
    maybeGrowBaseline();
  };

  /**
   * @param {"instant"|"smooth"} scrollBehavior
   * @param {{ disableTransition?: boolean }} [opts]
   */
  const applyExpandedLayout = (scrollBehavior = "instant", opts = {}) => {
    const { disableTransition = false } = opts;
    cancelStabilization();
    setEmbedActive(false);
    if (disableTransition) setInstantResize(true);
    // Scroll the iframe header into view BEFORE measuring available space.
    // Without this, getMaxFitHeight() measures only the space currently below
    // the iframe top — which can be tiny (e.g. 100px) when the iframe is near
    // the bottom of the viewport at collapsed height (62px). pinHeaderToViewport
    // corrects the scroll position first so computeHeight() sees the full
    // available space.
    pinHeaderToViewport(scrollBehavior);
    applyHeight(computeHeight());
    // fitBottomIfSafe after height is set: if the expanded iframe now overflows
    // the bottom, scroll it back up (only if the header still fits in view).
    fitBottomIfSafe(scrollBehavior);
    maybeGrowBaseline();
  };

  const applyLayout = ({ smoothScroll = false } = {}) => {
    if (!iframe) return;

    const scrollBehavior = smoothScroll ? "smooth" : "instant";
    const mode = getMode();

    if (mode === "collapsed") {
      applyCollapsedLayout();
      return;
    }

    if (mode === "anchored") {
      applyAnchoredLayout(scrollBehavior);
      return;
    }

    applyExpandedLayout(scrollBehavior);
  };

  const handleExpandedState = (expanded, { smoothScroll = false } = {}) => {
    if (!expanded) {
      if (!isExpanded) return;
      isExpanded = false;
      inputFocused = false;
      layoutGeneration += 1;
      applyCollapsedLayout();
      return;
    }

    const wasCollapsed = !isExpanded;
    isExpanded = true;

    if (wasCollapsed) {
      inputFocused = false;
      applyLayout({ smoothScroll });
    }
  };

  const handleChildMessage = (event) => {
    if (!allowedOrigin || event.origin !== allowedOrigin) return;
    if (event.source !== iframe?.contentWindow) return;

    const { type, isExpanded: nextExpanded } = event.data ?? {};

    if (type === "seleneFocus") {
      if (!isExpanded) return;
      inputFocused = true;
      applyAnchoredLayout("instant");
      return;
    }

    if (type === "seleneBlur") {
      if (!isExpanded) return;
      inputFocused = false;
      // Disable the CSS height transition so the iframe snaps directly to
      // the keyboard-closed height rather than animating through a
      // possibly-stale intermediate value.
      applyExpandedLayout("instant", { disableTransition: true });
      return;
    }

    if (type === "seleneLayout") {
      if (!isExpanded || !inputFocused) return;
      applyAnchoredLayout("instant");
      return;
    }

    const isStateMessage =
      type === "seleneState" ||
      (type === "seleneHeight" && typeof nextExpanded === "boolean");

    if (!isStateMessage) return;

    handleExpandedState(Boolean(nextExpanded), {
      smoothScroll: Boolean(nextExpanded),
    });
  };

  // Resize is the real keyboard-open/close signal on iOS
  // (visualViewport.height changes). The 350ms debounce coalesces all of
  // the rapid resize events that iOS fires during the ~300-400ms keyboard
  // animation into a single applyLayout() call after the animation settles.
  const onViewportResize = () => {
    if (!isExpanded) return;

    window.clearTimeout(viewportResizeTimer);
    viewportResizeTimer = window.setTimeout(() => {
      if (!isExpanded) return;
      applyLayout();
    }, 350);
  };

  const attach = () => {
    keyboardClosedBaseline = getVisibleHeight();

    window.removeEventListener("message", handleChildMessage, false);
    window.addEventListener("message", handleChildMessage, false);

    getViewport()?.removeEventListener("resize", onViewportResize);
    window.removeEventListener("resize", onViewportResize);

    getViewport()?.addEventListener("resize", onViewportResize);
    window.addEventListener("resize", onViewportResize);
  };

  const detach = () => {
    layoutGeneration += 1;
    cancelStabilization();
    window.clearTimeout(viewportResizeTimer);
    window.removeEventListener("message", handleChildMessage, false);
    getViewport()?.removeEventListener("resize", onViewportResize);
    window.removeEventListener("resize", onViewportResize);
    window.clearTimeout(instantResizeTimer);
  };

  return {
    attach,
    detach,
    applyLayout,
  };
}