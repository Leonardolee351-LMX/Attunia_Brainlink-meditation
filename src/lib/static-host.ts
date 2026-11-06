/** GitHub Pages / VITE_STATIC: no Node API. */
export function isStaticBuild(): boolean {
  try {
    return import.meta.env?.VITE_STATIC === "1";
  } catch {
    return false;
  }
}

export function isStaticPagesHost(): boolean {
  if (typeof window === "undefined") return isStaticBuild();
  const h = window.location.hostname || "";
  if (h.endsWith("github.io")) return true;
  return isStaticBuild();
}
