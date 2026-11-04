/**
 * Prefix public/ static paths with Vite `base` so GitHub Pages project
 * sites resolve under `/<repo>/…` instead of site-root `/…`.
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  // Avoid double slashes when base is "/" or ends with "/"
  return `${base}${normalized}`.replace(/([^:]\/)\/+/g, "$1");
}
