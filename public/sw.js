// KABRAK Service Worker — v3
// Strategy: only cache genuine static assets.
// NEVER intercept: API calls, Next.js RSC payloads, page navigation, cross-origin requests.

const CACHE_NAME = "kabrak-v3";

// Only files with these extensions get cached
const CACHEABLE_EXT = [".js", ".css", ".woff", ".woff2", ".ttf", ".otf", ".svg", ".png", ".ico", ".webp", ".jpg", ".jpeg"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Only handle GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 2. Never intercept cross-origin (Railway backend, external CDNs)
  if (url.origin !== self.location.origin) return;

  // 3. Never intercept Next.js internals: RSC payloads, HMR, internal API
  if (
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-State-Tree") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/api/")
  ) return;

  // 4. Only cache actual static files — skip everything else (page routes, etc.)
  const ext = "." + url.pathname.split(".").pop().toLowerCase();
  if (!CACHEABLE_EXT.includes(ext)) return;

  // 5. Cache-first for static assets
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return response;
          })
          .catch(() => new Response("", { status: 503 }))
    )
  );
});
