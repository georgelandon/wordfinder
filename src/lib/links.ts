function appBaseUrl() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}`;
}

export function buildHashUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${appBaseUrl()}#${normalized}`;
}

