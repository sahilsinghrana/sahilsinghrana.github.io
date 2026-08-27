function isTargetDate(day, month) {
  const now = new Date();
  return day === now.getDate() && month - 1 === now.getMonth();
}

function injectStylesheet(fileName) {
  const linkId = `css-injector-${fileName}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `/conditionalCss/${fileName}.css`;
  document.head.appendChild(link);
}

function injectScript(fileName) {
  const scriptId = `js-injector-${fileName}`;
  if (document.getElementById(scriptId)) {
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "module";
    script.src = `/conditionalJs/${fileName}.js`;
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () =>
      reject(new Error(`Failed to load script: ${fileName}.js`));

    document.head.appendChild(script);
  });
}

export default function dateBasedClassInjector(day, month, name) {
  try {
    if (!name || !isTargetDate(day, month)) return false;

    if (!document.body.classList.contains(name)) {
      document.body.classList.add(name);
      injectStylesheet(name);
    }

    return true;
  } catch (err) {
    console.error("Class injector error:", err);
    return false;
  }
}

export function dateBasedCssInjector(day, month, fileName) {
  try {
    if (!fileName || !isTargetDate(day, month)) return false;

    injectStylesheet(fileName);
    return true;
  } catch (err) {
    console.error("CSS injector error:", err);
    return false;
  }
}

export async function dateBasedJsInjector(day, month, fileName) {
  try {
    if (!fileName || !isTargetDate(day, month)) return false;

    await injectScript(fileName);
    return true;
  } catch (err) {
    console.error("JS injector error:", err);
    return false;
  }
}

export async function dateBasedJsAndCssInjector(day, month, entityName) {
  dateBasedCssInjector(day, month, entityName);
  return dateBasedJsInjector(day, month, entityName);
}
