function injectClass(fileName) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `/conditionalCss/${fileName}.css`;
  document.head.appendChild(link);
  return link;
}

const SHOW_DELAY_MS = 2200;

const STAMP_SVGS = {
  moon: `<svg class="stamp stamp-moon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <circle cx="22" cy="24" r="6.5" fill="none" stroke="currentColor" stroke-width="1.7"/>
    <circle cx="36" cy="20" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="44" cy="34" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/>
    <circle cx="28" cy="42" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
    <circle cx="18" cy="38" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/>
    <path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M54 30a6 6 0 0 1-4 8"/>
    <path fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" d="M14 44l3 2 3-1M14 48l3 2 3-1M14 52l3 2 3-1"/>
    <path fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" d="M42 48l3 2 3-1M42 52l3 2 3-1"/>
    <path fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" d="M46 16l2 3 3 1M50 14l2 3 3 1"/>
  </svg>`,
  catEyes: `<svg class="stamp stamp-cat-eyes" viewBox="0 0 96 36" aria-hidden="true" focusable="false">
    <ellipse cx="24" cy="18" rx="16" ry="11" fill="none" stroke="currentColor" stroke-width="2.8"/>
    <ellipse cx="72" cy="18" rx="16" ry="11" fill="none" stroke="currentColor" stroke-width="2.8"/>
    <ellipse cx="24" cy="18" rx="5" ry="10" fill="currentColor"/>
    <ellipse cx="72" cy="18" rx="5" ry="10" fill="currentColor"/>
    <circle cx="25.5" cy="14" r="1.6" fill="#141210" opacity="0.55"/>
    <circle cx="73.5" cy="14" r="1.6" fill="#141210" opacity="0.55"/>
  </svg>`,
  // Flat two-tone flute — parchment ink (matches letter cream)
  flute: `<svg class="stamp stamp-flute" viewBox="0 0 40 160" aria-hidden="true" focusable="false">
    <rect x="12" y="4" width="8" height="152" fill="#e8d4b5"/>
    <rect x="20" y="4" width="8" height="152" fill="#c9b097"/>
    <rect x="17" y="18" width="6" height="6" fill="#3a3026"/>
    <circle cx="20" cy="40" r="3.6" fill="#3a3026"/>
    <circle cx="20" cy="58" r="3.6" fill="#3a3026"/>
    <circle cx="20" cy="76" r="3.6" fill="#3a3026"/>
    <circle cx="20" cy="94" r="3.6" fill="#3a3026"/>
    <circle cx="20" cy="112" r="3.6" fill="#3a3026"/>
    <rect x="12" y="132" width="16" height="10" fill="#3a3026"/>
  </svg>`,
};

function createStampsEl() {
  const wrap = document.createElement("div");
  wrap.className = "poetic-alert-stamps";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = STAMP_SVGS.catEyes + STAMP_SVGS.moon + STAMP_SVGS.flute;

  const tulip = document.createElement("img");
  tulip.className = "stamp stamp-tulip";
  tulip.src = "/conditionalAssets/tulip-stamp.png";
  tulip.alt = "";
  tulip.decoding = "async";
  wrap.appendChild(tulip);

  return wrap;
}

function lockPageScroll() {
  const scrollY = window.scrollY;
  document.documentElement.style.setProperty(
    "--poetic-scroll-y",
    `${-scrollY}px`,
  );
  document.body.dataset.poeticScrollY = String(scrollY);
  document.body.style.position = "fixed";
  document.body.style.top = `${-scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
}

function unlockPageScroll() {
  const scrollY = Number(document.body.dataset.poeticScrollY || "0");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.style.overflow = "";
  delete document.body.dataset.poeticScrollY;
  document.documentElement.style.removeProperty("--poetic-scroll-y");
  window.scrollTo(0, scrollY);
}

function createAlert(title, message, extended) {
  injectClass("poeticAlert");

  const dialogEl = document.createElement("dialog");
  dialogEl.id = "poetic-alert";

  const stampsEl = createStampsEl();
  const titleEl = document.createElement("p");
  titleEl.className = "poetic-alert-title";
  titleEl.textContent = title;

  const bodyEl = document.createElement("div");
  bodyEl.className = "poetic-alert-body";

  const contentEl = document.createElement("p");
  contentEl.className = "poetic-alert-content";
  contentEl.textContent = message;
  bodyEl.append(contentEl);

  let expandEl = null;
  let extendedEl = null;
  let readMoreBtn = null;

  if (extended) {
    readMoreBtn = document.createElement("button");
    readMoreBtn.type = "button";
    readMoreBtn.textContent = "Read more!!";
    readMoreBtn.className = "poetic-alert-read-more-btn";

    expandEl = document.createElement("div");
    expandEl.className = "poetic-alert-expand";

    const expandInner = document.createElement("div");
    expandInner.className = "poetic-alert-expand-inner";

    extendedEl = document.createElement("p");
    extendedEl.className = "poetic-alert-content extended";
    extendedEl.textContent = extended;

    expandInner.append(extendedEl);
    expandEl.append(expandInner);

    readMoreBtn.onclick = () => {
      expandEl.classList.add("is-open");
      readMoreBtn.classList.add("is-hidden");
      window.setTimeout(() => {
        readMoreBtn.remove();
        bodyEl.scrollTo({
          top: Math.max(0, expandEl.offsetTop - 12),
          behavior: "smooth",
        });
      }, 320);
    };

    bodyEl.append(readMoreBtn, expandEl);
  }

  const closeBtnEl = document.createElement("button");
  closeBtnEl.type = "button";
  closeBtnEl.className = "poetic-alert-close-btn";
  closeBtnEl.textContent = "Close!";
  closeBtnEl.setAttribute("commandFor", "poetic-alert");
  closeBtnEl.setAttribute("command", "close");

  const dismiss = () => {
    unlockPageScroll();
    if (dialogEl.open) {
      dialogEl.close();
    }
    dialogEl.remove();
  };

  closeBtnEl.onclick = dismiss;
  dialogEl.addEventListener("cancel", (e) => {
    e.preventDefault();
    dismiss();
  });

  dialogEl.append(stampsEl, titleEl, bodyEl, closeBtnEl);
  document.body.append(dialogEl);

  window.setTimeout(() => {
    if (!dialogEl.isConnected) return;
    lockPageScroll();
    dialogEl.showModal();
    dialogEl.focus({ preventScroll: true });
  }, SHOW_DELAY_MS);
}

const mainMessage = `
    Stay kind,
    Be safe,
    Celebrate!!.
  `;

const extendedMsg = `
"Eyes like midnight ocean,
Shining hairs; a natural delight.

Bluntness so sharp,
cuts through, all the noise;

Infinite curiosity;
hey! relentless kitten,
honest you too are not,
beneath the facade,
there's a version, hidden.

So stubborn you are,
corageous, yet so kind.

It's all peace around you,
there's a pleasing calm.
yet i get numb,

Stop never, 
You've worked so hard, 
Victory is your rightful crown,
you belong among the best.

It's your day,
It's your night,
Celebrate!!
`;

function createBdAlert() {
  createAlert("Celebrate!", mainMessage, extendedMsg);
}

createBdAlert();
