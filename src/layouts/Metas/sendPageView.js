try {
  function sendPageView() {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "page_view",
        page_title: document.title,
        page_location: location.href,
        page_path: location.pathname,
      });
    } catch (e) {
      console.warn("pageview push failed", e);
    }
  }

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    sendPageView();
  } else {
    window.addEventListener("DOMContentLoaded", sendPageView);
  }

  (function () {
    const origPush = history.pushState;
    history.pushState = function (...args) {
      origPush.apply(this, args);
      sendPageView();
    };
    const origReplace = history.replaceState;
    history.replaceState = function (...args) {
      origReplace.apply(this, args);
      sendPageView();
    };
    window.addEventListener("popstate", sendPageView);
  })();
} catch (e) {
  console.warn("pageview setup failed", e);
}
