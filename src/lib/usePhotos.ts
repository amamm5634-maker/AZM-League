import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryPhoto } from '../types';
import { repository } from '../services';

interface Options {
  matchId?: string;
  /** حجم الصفحة (الافتراضي 24) */
  limit?: number;
}

/**
 * يحمّل صور المعرض عند فتح الصفحة فقط (لا يدخل في التحديث الدوري للنتائج، لتوفير بيانات الزوار).
 * يدعم "عرض المزيد". أي فشل لا يكسر الصفحة: يرجع error فقط.
 */
export function usePhotos({ matchId, limit = 24 }: Options = {}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0); // يتجاهل ردود الطلبات القديمة عند تغيّر الفلتر بسرعة

  const reload = useCallback(() => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    repository
      .loadPhotos({ matchId, limit, offset: 0 })
      .then((page) => {
        if (mine !== seq.current) return;
        setPhotos(page.photos);
        setHasMore(page.hasMore);
      })
      .catch(() => {
        if (mine !== seq.current) return;
        setError('تعذّر تحميل الصور. تحقق من الاتصال وحاول مرة أخرى.');
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  }, [matchId, limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loadMore = useCallback(() => {
    const mine = seq.current;
    setLoadingMore(true);
    repository
      .loadPhotos({ matchId, limit, offset: photos.length })
      .then((page) => {
        if (mine !== seq.current) return;
        setPhotos((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...page.photos.filter((p) => !seen.has(p.id))];
        });
        setHasMore(page.hasMore);
      })
      .catch(() => {
        if (mine === seq.current) setError('تعذّر تحميل المزيد من الصور.');
      })
      .finally(() => setLoadingMore(false));
  }, [matchId, limit, photos.length]);

  return { photos, hasMore, loading, loadingMore, error, reload, loadMore, setPhotos };
}
