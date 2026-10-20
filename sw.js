/* sw.js — Light Sun Library service worker (v3)
   ----------------------------------------------------------------------------
   NAYA v3 (zaroori fix):
   - Pehle ye purani files cache se dikhata tha, isliye app update karne par
     bhi purana code chalta rehta tha (jaise Publish form me Price field).
   - Ab: HTML aur .js files ke liye NETWORK-FIRST — yaani hamesha naya code
     pehle aayega, internet na ho to cache se chalega.
   - Icons/manifest cache-first (tez).
   - Purana cache (lsl-v2) delete ho jayega.

   Lagane ka tarika:
   1) Is file ko repo me "sw.js" naam se upload karo (purani ke upar).
   2) Phone par site ko 2 baar reload karo (ya app band karke dobara kholo),
      taaki naya service worker lag jaye.
   ============================================================================ */
const CACHE = "lsl-v3";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./protect.js",
  "./ads.js",
  "./free.js",
  "./pwa.js",
  "./tts.js",
  "./webtoon.js"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {}))
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
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  /* sirf apni site — ads/video ad/IMA ko pass-through */
  if (url.origin !== self.location.origin) return;

  const isDoc = req.mode === "navigate" || req.destination === "document";
  const isCode = /\.(?:js|css|json)$/i.test(url.pathname);

  /* HTML + code: pehle network (naya code), na mile to cache */
  if (isDoc || isCode) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("./index.html"))
        )
    );
    return;
  }

  /* images / icons: pehle cache (tez), warna network */
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});

