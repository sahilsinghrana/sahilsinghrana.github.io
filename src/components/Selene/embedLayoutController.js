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
  anchorStabilizePasses: 3,
  anchorHeightEpsilon: 2,
};

const INSTANT_RESIZE_DEBOUNCE_MS = 50;

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
  let anchorFrameId = 0;
  let viewportLayoutTimer = 0;

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

  const pinHeaderToViewport = (behavior = "instant") => {
    if (!iframe) return;

    const bounds = getViewportBounds();
    if (!bounds) return;

    const rect = iframe.getBoundingClientRect();
    const delta = rect.top - bounds.top;

    if (Math.abs(delta) >= 1) {
      window.scrollBy({ top: delta, behavior });
      return;
    }

    const afterScroll = iframe.getBoundingClientRect();
    if (Math.abs(afterScroll.top - bounds.top) >= 1) {
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

  const cancelAnchorStabilization = () => {
    if (anchorFrameId) {
      cancelAnimationFrame(anchorFrameId);
      anchorFrameId = 0;
    }
  };

  const applyCollapsedLayout = () => {
    cancelAnchorStabilization();
    setEmbedActive(false);
    setInstantResize(true);
    applyHeight(IFRAME_HEIGHT.collapsed);
  };

  const applyExpandedLayout = (scrollBehavior = "instant") => {
    setEmbedActive(false);
    pinHeaderToViewport(scrollBehavior);
    applyHeight(computeHeight());
    fitBottomIfSafe(scrollBehavior);
    pinHeaderToViewport(scrollBehavior);
    applyHeight(computeHeight());
  };

  const applyAnchoredLayout = (scrollBehavior = "instant") => {
    const generation = layoutGeneration;
    setEmbedActive(true);
    setInstantResize(true);
    cancelAnchorStabilization();

    let lastHeight = -1;

    const stabilize = (pass = 0) => {
      if (generation !== layoutGeneration || getMode() !== "anchored") {
        return;
      }

      pinHeaderToViewport(scrollBehavior);
      const height = computeHeight();

      if (
        pass > 0 &&
        Math.abs(height - lastHeight) < IFRAME_HEIGHT.anchorHeightEpsilon
      ) {
        return;
      }

      lastHeight = height;
      applyHeight(height);

      if (pass + 1 < IFRAME_HEIGHT.anchorStabilizePasses) {
        anchorFrameId = requestAnimationFrame(() => stabilize(pass + 1));
      }
    };

    stabilize(0);
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
      applyLayout({ smoothScroll: true });
      return;
    }

    if (type === "seleneBlur") {
      if (!isExpanded) return;
      inputFocused = false;
      applyLayout();
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

  const onViewportChange = () => {
    if (!isExpanded) return;

    window.clearTimeout(viewportLayoutTimer);
    viewportLayoutTimer = window.setTimeout(() => {
      if (!isExpanded) return;
      applyLayout();
    }, 16);
  };

  const attach = () => {
    window.removeEventListener("message", handleChildMessage, false);
    window.addEventListener("message", handleChildMessage, false);

    getViewport()?.removeEventListener("resize", onViewportChange);
    getViewport()?.removeEventListener("scroll", onViewportChange);
    window.removeEventListener("resize", onViewportChange);

    getViewport()?.addEventListener("resize", onViewportChange);
    getViewport()?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange);
  };

  const detach = () => {
    layoutGeneration += 1;
    cancelAnchorStabilization();
    window.clearTimeout(viewportLayoutTimer);
    window.removeEventListener("message", handleChildMessage, false);
    getViewport()?.removeEventListener("resize", onViewportChange);
    getViewport()?.removeEventListener("scroll", onViewportChange);
    window.removeEventListener("resize", onViewportChange);
    window.clearTimeout(instantResizeTimer);
  };

  return {
    attach,
    detach,
    applyLayout,
  };
}
