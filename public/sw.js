// KABRAK Service Worker — v6 (network-first for JS/CSS to avoid stale chunk errors)
// Strategy: network-first for JS/CSS (always fresh, prevents ChunkLoadError after deploy),
//           cache-first for fonts/images (stable assets).
// NEVER intercept: API calls, Next.js RSC payloads, page navigation, cross-origin requests.

const CACHE_NAME = "kabrak-v6";

// Assets that change on every deploy — always fetch fresh, cache as offline fallback
const NETWORK_FIRST_EXT = [".js", ".css"];
// Stable assets — safe to serve from cache first
const CACHE_FIRST_EXT = [".woff", ".woff2", ".ttf", ".otf", ".svg", ".png", ".ico", ".webp", ".jpg", ".jpeg"];

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

  // 4. Determine strategy by extension
  const ext = "." + url.pathname.split(".").pop().toLowerCase();

  // 5a. Network-first for JS/CSS: always get the latest build, fall back to cache offline
  if (NETWORK_FIRST_EXT.includes(ext)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response("", { status: 503 })))
    );
    return;
  }

  // 5b. Cache-first for stable assets (fonts, images)
  if (CACHE_FIRST_EXT.includes(ext)) {
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
    return;
  }

  // 6. Everything else (page routes, etc.) — don't intercept
});
