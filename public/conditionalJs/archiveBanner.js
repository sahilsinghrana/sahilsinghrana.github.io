(function showArchiveBanner() {
  if (document.getElementById("site-archive-banner")) return;

  const style = document.createElement("style");
  style.id = "site-archive-banner-style";
  style.textContent = `
    #site-archive-banner {
      box-sizing: border-box;
      width: 100%;
      margin: 0;
      padding: 0.55em 1em;
      background: #3a2f1a;
      color: #f0e6d2;
      border-bottom: 1px solid #6b5a3a;
      font-family: var(--font-raleway, "Raleway", sans-serif);
      font-size: 0.85rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      text-align: center;
      line-height: 1.4;
      position: relative;
      z-index: 100;
    }

    @media screen and (max-width: 486px) {
      #site-archive-banner {
        font-size: 0.78rem;
        padding: 0.5em 0.75em;
      }
    }
  `;
  document.head.appendChild(style);

  const banner = document.createElement("div");
  banner.id = "site-archive-banner";
  banner.setAttribute("role", "status");
  banner.textContent = "Archived! Site may contain outdated data";

  const header = document.querySelector("header");
  if (header) {
    header.before(banner);
  } else {
    document.body.prepend(banner);
  }
})();
