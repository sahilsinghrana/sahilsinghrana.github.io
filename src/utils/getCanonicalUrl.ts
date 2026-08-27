import { SITE_ORIGIN } from "./site";

export function getCleanCanonicalUrl(
  pathname: string,
  site: URL | string | undefined,
): URL {
  if (!site) {
    site = SITE_ORIGIN;
  }

  let cleanPath = pathname;

  cleanPath = cleanPath.replace(/\/index\.html$/, "/");

  cleanPath = cleanPath.replace(/\.html$/, "");

  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }

  return new URL(cleanPath || "", site);
}

export function toAbsoluteUrl(
  pathOrUrl: string,
  site: URL | string | undefined = SITE_ORIGIN,
): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const origin =
    typeof site === "string" ? site : (site?.origin ?? SITE_ORIGIN);
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return new URL(path, origin).href;
}
