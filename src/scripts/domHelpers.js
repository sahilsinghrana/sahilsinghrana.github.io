export function hideElement(el) {
  if (!el) return;
  el.classList.add("displayNone");
}

export function showElement(el) {
  if (!el) return;
  el.classList.remove("displayNone");
}
