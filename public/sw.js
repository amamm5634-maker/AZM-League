/* دوري عزم — Service Worker: يخزّن الموقع بعد أول زيارة فيعمل بدون نت.
   عند نشر نسخة جديدة غيّر رقم VERSION ليتجدد التخزين عند المستخدمين. */
const VERSION = 'azm-v2';
const SHELL = `azm-shell-${VERSION}`;
const RUNTIME = `azm-runtime-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(['./', './manifest.webmanifest', './ball.png', './icons/icon-192.png']).catch(() => undefined)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return; // Supabase وغيره: دائماً من الشبكة

  // الصفحة نفسها: الشبكة أولاً (لنحصل على آخر نسخة)، وعند انقطاع النت من التخزين
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./').then((r) => r || Response.error())),
    );
    return;
  }

  // باقي الملفات (JS/CSS/صور/خطوط): من التخزين فوراً ثم نحدّثها في الخلفية
  event.respondWith(
    caches.open(RUNTIME).then((cache) =>
      cache.match(req).then((cached) => {
        const fresh = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      }),
    ),
  );
});
