const CACHE = "rodaje-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./fonts/lora-latin-400-normal.woff2",
  "./fonts/lora-latin-700-normal.woff2",
  "./fonts/playfair-display-latin-700-normal.woff2",
  "./fonts/oswald-latin-600-normal.woff2",
  "./fonts/barlow-latin-400-normal.woff2",
  "./fonts/barlow-latin-600-normal.woff2",
  "./fonts/courier-prime-latin-400-normal.woff2",
  "./fonts/courier-prime-latin-700-normal.woff2",
  "./fonts/space-grotesk-latin-500-normal.woff2",
  "./fonts/space-grotesk-latin-700-normal.woff2",
  "./fonts/inter-latin-400-normal.woff2",
  "./fonts/inter-latin-600-normal.woff2",
  "./fonts/jetbrains-mono-latin-400-normal.woff2",
  "./fonts/jetbrains-mono-latin-700-normal.woff2"
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

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // los guiones sincronizados siempre van directo a la red (nunca desde caché):
  // la app ya guarda su propia copia en el celular.
  if (url.origin === self.location.origin && url.pathname.includes("/proyectos/")) return;

  // la página: se abre al instante desde caché (funciona sin internet) y se
  // actualiza en segundo plano para la próxima vez. El ?i= de un link de
  // import lo lee la propia página, así que abre igual sin conexión.
  if (e.request.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then((shell) => {
        const refresh = fetch("./index.html", { cache: "no-store" })
          .then((res) => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put("./index.html", clone));
            }
            return res;
          })
          .catch(() => shell);
        if (shell) { e.waitUntil(refresh); return shell; }
        return refresh;
      })
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
