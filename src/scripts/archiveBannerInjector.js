export const ARCHIVE_YEAR = 2026;
export const ARCHIVE_MONTH = 11; // November
export const ARCHIVE_DAY = 27;

function isArchived(now = new Date()) {
  const archiveStart = new Date(ARCHIVE_YEAR, ARCHIVE_MONTH - 1, ARCHIVE_DAY);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today >= archiveStart;
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

export default async function archiveBannerInjector() {
  try {
    if (!isArchived()) return false;

    await injectScript("archiveBanner");
    return true;
  } catch (err) {
    console.error("Archive banner injector error:", err);
    return false;
  }
}
