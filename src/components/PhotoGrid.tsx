import { useState } from 'react';
import type { GalleryPhoto } from '../types';
import { Lightbox } from './Lightbox';

interface Props {
  photos: GalleryPhoto[];
  describe?: (p: GalleryPhoto) => { label?: string; href?: string } | undefined;
}

/** شبكة صور مصغّرة؛ الضغط على صورة يفتح العارض. المصغّرات تُحمَّل كسولاً لتوفير بيانات الزائر. */
export function PhotoGrid({ photos, describe }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <ul className="photo-grid">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => setOpen(i)} aria-label={p.caption ? `افتح الصورة: ${p.caption}` : `افتح الصورة ${i + 1}`}>
              <img src={p.thumb} alt={p.caption ?? ''} loading="lazy" decoding="async" />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox photos={photos} index={open} describe={describe} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
