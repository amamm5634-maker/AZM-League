import { useState } from 'react';
import type { Match } from '../types';
import { renderMatchImage } from '../lib/shareImage';
import { useData } from '../store';
import { Icon } from './Icon';

/** زر "صورة للمشاركة": يولّد بطاقة النتيجة PNG، ويفتح قائمة المشاركة في الموبايل (واتساب مثلاً) أو ينزّلها */
export function ShareImageButton({ match }: { match: Match }) {
  const state = useData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onClick() {
    setBusy(true);
    setError('');
    try {
      const blob = await renderMatchImage(state, match);
      const file = new File([blob], `azm-${match.id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'دوري عزم' });
          return;
        } catch (e) {
          if ((e as DOMException).name === 'AbortError') return; // المستخدم أغلق القائمة
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      setError('تعذّر إنشاء الصورة. جرّب مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="share-btn" onClick={onClick} disabled={busy} aria-label="إنشاء صورة النتيجة للمشاركة">
        <Icon name="share" /> {busy ? 'جارٍ الإنشاء…' : 'صورة للمشاركة'}
      </button>
      {error && <span role="alert" className="field-hint">{error}</span>}
    </>
  );
}
