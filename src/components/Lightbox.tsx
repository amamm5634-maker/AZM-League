import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryPhoto } from '../types';
import { formatArabicDate } from '../lib/stats';
import { siteUrl } from './ShareButton';

interface Props {
  photos: GalleryPhoto[];
  index: number;
  /** نص إضافي يظهر تحت الصورة (مثل اسم المباراة) */
  describe?: (p: GalleryPhoto) => { label?: string; href?: string } | undefined;
  onIndex: (i: number) => void;
  onClose: () => void;
}

/** عارض الصور بملء الشاشة: أسهم/سحب للتنقل، Esc للإغلاق، ومشاركة الصورة نفسها (واتساب) إن دعم الجهاز */
export function Lightbox({ photos, index, describe, onIndex, onClose }: Props) {
  const photo = photos[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const [shareMsg, setShareMsg] = useState('');

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < photos.length) onIndex(next);
    },
    [index, photos.length, onIndex],
  );

  // تركيز على زر الإغلاق، وقفل تمرير الصفحة، وإعادة التركيز للعنصر السابق عند الإغلاق
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // الواجهة RTL: السهم الأيسر = التالي
      else if (e.key === 'ArrowLeft') go(+1);
      else if (e.key === 'ArrowRight') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // تحميل مسبق للصورتين المجاورتين لتنقل أسرع
  useEffect(() => {
    [photos[index + 1], photos[index - 1]].forEach((p) => {
      if (p) new Image().src = p.url;
    });
  }, [index, photos]);

  useEffect(() => setShareMsg(''), [index]);

  if (!photo) return null;
  const info = describe?.(photo);

  async function share() {
    setShareMsg('');
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const file = new File([blob], `azm-${photo.id}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'دوري عزم', text: photo.caption });
        return;
      }
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
    // بديل: رابط واتساب بنص ورابط المعرض
    const text = `${photo.caption ? `${photo.caption}\n` : ''}صور دوري عزم\n${siteUrl('#/gallery')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    setShareMsg('تعذّرت مشاركة الصورة نفسها، فتحنا رابط المعرض بدلاً منها.');
  }

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="عارض الصور"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        startX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const x0 = startX.current;
        startX.current = null;
        const x1 = e.changedTouches[0]?.clientX;
        if (x0 == null || x1 == null) return;
        const dx = x1 - x0;
        if (Math.abs(dx) < 50) return;
        go(dx < 0 ? +1 : -1); // السحب لليسار = التالي (RTL)
      }}
    >
      <button ref={closeRef} type="button" className="lb-close" onClick={onClose} aria-label="إغلاق">✕</button>
      <span className="lb-count" aria-live="polite">{index + 1} / {photos.length}</span>

      <button type="button" className="lb-nav lb-prev" onClick={() => go(-1)} disabled={index === 0} aria-label="الصورة السابقة">›</button>
      <button type="button" className="lb-nav lb-next" onClick={() => go(+1)} disabled={index === photos.length - 1} aria-label="الصورة التالية">‹</button>

      <figure className="lb-figure">
        <img key={photo.id} src={photo.url} alt={photo.caption ?? 'صورة من دوري عزم'} />
        <figcaption>
          {photo.caption && <p className="lb-caption">{photo.caption}</p>}
          <div className="lb-meta">
            <span>{formatArabicDate(photo.createdAt.slice(0, 10))}</span>
            {info?.label && (info.href ? <a href={info.href} onClick={onClose}>{info.label}</a> : <span>{info.label}</span>)}
            <button type="button" className="share-btn" onClick={() => void share()}>مشاركة الصورة</button>
            <a className="share-btn" href={photo.url} target="_blank" rel="noopener noreferrer">فتح بالحجم الكامل</a>
          </div>
          {shareMsg && <p className="field-hint" role="status">{shareMsg}</p>}
        </figcaption>
      </figure>
    </div>
  );
}
