/**
 * رابط مطلق لملف من مجلد public.
 * مهم: المسارات النسبية داخل متغيرات CSS (var(--x)) تُحلّ نسبةً إلى ملف الـ CSS (داخل assets/)
 * لا إلى الصفحة، فتفشل الصورة. لذلك نحوّل الرابط إلى رابط مطلق قبل وضعه في style.
 */
export function assetUrl(path: string): string {
  return new URL(`${import.meta.env.BASE_URL}${path}`, document.baseURI).href;
}
