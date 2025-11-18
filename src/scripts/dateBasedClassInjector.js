export default function dateBasedClassInjector(
  day = 28,
  month = 11,
  className = "colorful",
) {
  if (!className) return;

  const body = document.body;

  const currentDate = new Date();

  const isTargetDate =
    day == currentDate.getDate() && month - 1 == currentDate.getMonth();

  if (isTargetDate && !body.classList.contains(className)) {
    body.classList.add(className);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `/conditionalCss/${className}.css`;
    document.head.appendChild(link);
  }

  return isTargetDate;
}
