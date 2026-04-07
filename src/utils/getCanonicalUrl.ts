export function getCleanCanonicalUrl(
  pathname: string,
  site: URL | string | undefined,
): URL {
  if (!site) {
    site = "https://sahilrana.in";
  }

  let cleanPath = pathname;

  cleanPath = cleanPath.replace(/\/index\.html$/, "/");

  cleanPath = cleanPath.replace(/\.html$/, "");

  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }

  return new URL(cleanPath || "", site);
}
