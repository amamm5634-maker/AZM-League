import { Icon } from './Icon';

/** رابط الموقع الحالي مع قسم معيّن (مثل #/fixtures) */
export function siteUrl(hash = ''): string {
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

/** زر مشاركة عبر واتساب: يفتح واتساب بنص جاهز ورابط الصفحة */
export function ShareButton({ text, hash = '', label = 'مشاركة' }: { text: string; hash?: string; label?: string }) {
  const href = `https://wa.me/?text=${encodeURIComponent(`${text}\n${siteUrl(hash)}`)}`;
  return (
    <a className="share-btn" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} عبر واتساب`}>
      <Icon name="share" /> {label}
    </a>
  );
}
