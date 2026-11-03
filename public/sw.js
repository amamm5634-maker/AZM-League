/*
 * تنظيف آمن للنسخ القديمة.
 * كانت النسخة السابقة تعترض طلبات CSS وJavaScript؛ إذا فشل طلب واحد قد تعرض
 * الصفحة بيضاء. لا نعترض الطلبات الآن: Cloudflare يقدّم دائماً أحدث ملفات البناء.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});
