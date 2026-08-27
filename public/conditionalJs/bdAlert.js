function injectClass(fileName) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `/conditionalCss/${fileName}.css`;
  document.head.appendChild(link);
}

function createAlert(title, message, extended) {
  injectClass("poeticAlert");

  const dialogEl = document.createElement("dialog");
  const titleEl = document.createElement("p");
  const contentEl = document.createElement("p");
  const closeBtnEl = document.createElement("button");

  dialogEl.append(titleEl);
  dialogEl.append(contentEl);
  dialogEl.append(closeBtnEl);

  dialogEl.id = "poetic-alert";
  titleEl.className = "poetic-alert-title";
  contentEl.className = "poetic-alert-content";
  closeBtnEl.classList = "poetic-alert-close-btn";

  titleEl.textContent = title;
  contentEl.textContent = message;

  closeBtnEl.textContent = "Close!";
  closeBtnEl.setAttribute("commandFor", "poetic-alert");
  closeBtnEl.setAttribute("command", "close");
  closeBtnEl.onclick = () => {
    dialogEl.remove();
  };

  if (extended) {
    const extendedEl = document.createElement("p");
    const extendedBtnEl = document.createElement("button");

    extendedBtnEl.type = "button";
    extendedBtnEl.textContent = "Read more!!";
    extendedBtnEl.className = "poetic-alert-read-more-btn";

    extendedEl.className = "poetic-alert-content extended";
    extendedEl.textContent = extended;

    extendedBtnEl.onclick = () => {
      dialogEl.insertBefore(extendedEl, extendedBtnEl);
      extendedBtnEl.remove();
    };

    dialogEl.insertBefore(extendedBtnEl, closeBtnEl);
  }

  document.body.append(dialogEl);

  dialogEl.showModal();
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
  const title = "Celebrate!";
  const message = mainMessage;

  const extended = extendedMsg;

  createAlert(title, message, extended);
}

createBdAlert();
