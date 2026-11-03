/** معرّف عشوائي لهذا المتصفح (لتقييد تكرار الرسائل فقط). ليس هوية شخصية ويُعاد إنشاؤه إن مُسح التخزين. */
export function deviceId(): string {
  const KEY = 'azm-device';
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved && saved.length >= 8) return saved;
    const fresh = (window.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`).slice(0, 40);
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return `tmp${Math.random().toString(36).slice(2, 14)}`;
  }
}
