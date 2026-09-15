const CACHE = "rodaje-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// cache-first para el shell de la app; cualquier cosa nueva del mismo origen
// se guarda de paso para la próxima vez que no haya internet.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // toda navegación (incluida index.html?i=... de un link de import) sirve
  // el shell cacheado: la propia página lee el ?i= de location.search,
  // así que un link de import abre offline igual.
  if (e.request.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then((shell) => shell || fetch(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
