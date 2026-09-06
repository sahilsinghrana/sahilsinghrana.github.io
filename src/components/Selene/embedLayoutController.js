/** @typedef {'collapsed' | 'expanded'} LayoutMode */

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

const HEADER_VISIBILITY_FALLBACK_MS = 320;

// Viewport changes do not drive iframe height or page scrolling.

/**
 * @param {HTMLIFrameElement | null} iframe
 * @param {HTMLElement | null} container
 */
export function createEmbedLayoutController(iframe, container) {
  const allowedOrigin = iframe ? new URL(iframe.src).origin : "";

  let isExpanded = false;
  let hasEnsuredHeaderForOpen = false;
  let ensureHeaderFrameId;
  let ensureHeaderFallbackId;
  let ensureHeaderTransitionHandler;

  const getViewport = () => window.visualViewport;
  const getVisibleHeight = () => getViewport()?.height ?? window.innerHeight;

  /** @returns {LayoutMode} */
  const getMode = () => {
    if (!isExpanded) return "collapsed";
    return "expanded";
  };

  const computeExpandedHeight = () => {
    const visibleHeight = getVisibleHeight();
    if (!Number.isFinite(visibleHeight) || visibleHeight <= 0) {
      return IFRAME_HEIGHT.defaultExpanded;
    }
    const ratioHeight = Math.floor(
      visibleHeight * IFRAME_HEIGHT.expandedViewportRatio,
    );
    return Math.min(
      Math.max(ratioHeight, IFRAME_HEIGHT.expandedMin),
      visibleHeight - IFRAME_HEIGHT.visibleHeightOffset,
      IFRAME_HEIGHT.max,
    );
  };

  const computeHeight = () => {
    const mode = getMode();
    if (mode === "collapsed") return IFRAME_HEIGHT.collapsed;
    return computeExpandedHeight();
  };
  const setEmbedActive = (active) => {
    container?.classList.toggle("selene-embed-active", active);
  };

  const ensureSeleneHeaderInViewport = () => {
    if (!iframe) return;

    const viewport = getViewport();
    const viewportTop =
      (viewport?.offsetTop ?? 0) + IFRAME_HEIGHT.widgetViewportPadding;
    const headerRect = iframe.getBoundingClientRect();
    const offsetFromTarget = headerRect.top - viewportTop;

    if (Math.abs(offsetFromTarget) < 1) {
      return;
    }

    const targetScrollTop = window.scrollY + offsetFromTarget;
    window.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
  };

  const finishScheduledHeaderVisibilityAdjustment = () => {
    if (ensureHeaderTransitionHandler && iframe) {
      iframe.removeEventListener(
        "transitionend",
        ensureHeaderTransitionHandler,
      );
    }
    ensureHeaderTransitionHandler = undefined;
    window.clearTimeout(ensureHeaderFallbackId);
    ensureHeaderFallbackId = undefined;

    if (isExpanded) ensureSeleneHeaderInViewport();
  };

  const scheduleSeleneHeaderVisibilityAdjustment = () => {
    if (ensureHeaderFrameId !== undefined) return;

    ensureHeaderFrameId = window.requestAnimationFrame(() => {
      ensureHeaderFrameId = undefined;
      if (!isExpanded || !iframe) return;

      ensureHeaderTransitionHandler = (event) => {
        if (event.propertyName === "height") {
          finishScheduledHeaderVisibilityAdjustment();
        }
      };
      iframe.addEventListener("transitionend", ensureHeaderTransitionHandler);
      ensureHeaderFallbackId = window.setTimeout(
        finishScheduledHeaderVisibilityAdjustment,
        HEADER_VISIBILITY_FALLBACK_MS,
      );
    });
  };

  const cancelScheduledHeaderVisibilityAdjustment = () => {
    if (ensureHeaderFrameId !== undefined) {
      window.cancelAnimationFrame(ensureHeaderFrameId);
      ensureHeaderFrameId = undefined;
    }

    if (ensureHeaderTransitionHandler && iframe) {
      iframe.removeEventListener(
        "transitionend",
        ensureHeaderTransitionHandler,
      );
      ensureHeaderTransitionHandler = undefined;
    }
    window.clearTimeout(ensureHeaderFallbackId);
    ensureHeaderFallbackId = undefined;
  };

  const applyHeight = (height) => {
    if (!iframe) return;
    iframe.style.height = `${height}px`;
  };

  const applyLayout = () => {
    if (!iframe) return;
    const mode = getMode();

    if (mode === "collapsed") {
      setEmbedActive(false);
      applyHeight(IFRAME_HEIGHT.collapsed);
      return;
    }

    // expanded
    setEmbedActive(false);
    applyHeight(computeHeight());
  };

  const handleExpandedState = (expanded) => {
    if (!expanded) {
      if (!isExpanded) return;
      isExpanded = false;
      hasEnsuredHeaderForOpen = false;
      cancelScheduledHeaderVisibilityAdjustment();
      applyLayout();
      return;
    }

    const wasCollapsed = !isExpanded;
    isExpanded = true;

    if (wasCollapsed) {
      hasEnsuredHeaderForOpen = false;
      applyLayout();
      if (!hasEnsuredHeaderForOpen) {
        hasEnsuredHeaderForOpen = true;
        scheduleSeleneHeaderVisibilityAdjustment();
      }
    }
  };

  const handleChildMessage = (event) => {
    if (!allowedOrigin || event.origin !== allowedOrigin) return;
    if (event.source !== iframe?.contentWindow) return;

    const { type, isExpanded: nextExpanded } = event.data ?? {};

    if (type === "seleneFocus") {
      // Focus/blur no longer drives height changes — the iframe stays at
      // expanded height whether or not the keyboard is open.  Message kept
      // for potential future use but has no layout effect.
      return;
    }

    if (type === "seleneBlur") {
      // Same — no layout change on blur.
      return;
    }

    if (type === "seleneLayout") {
      // Without anchored mode there is nothing to re-apply on layout events.
      return;
    }

    const isStateMessage =
      type === "seleneState" ||
      (type === "seleneHeight" && typeof nextExpanded === "boolean");

    if (!isStateMessage) return;

    handleExpandedState(Boolean(nextExpanded));
  };

  const attach = () => {
    window.removeEventListener("message", handleChildMessage, false);
    window.addEventListener("message", handleChildMessage, false);
  };

  const detach = () => {
    cancelScheduledHeaderVisibilityAdjustment();
    window.removeEventListener("message", handleChildMessage, false);
  };

  return {
    attach,
    detach,
    applyLayout,
  };
}
