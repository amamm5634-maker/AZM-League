import { useMemo, useState } from 'react';
import { repository } from '../services';
import { matchLabel } from '../lib/gallery';
import { usePhotos } from '../lib/usePhotos';
import { useRoundPhotos } from '../lib/useRoundPhotos';
import { ROUND_LABELS } from '../data/config';
import { sortMatches, formatArabicDate } from '../lib/stats';
import { useData } from '../store';
import { ErrorBox, EmptyState, Loading, PageHead } from '../components/StateViews';
import { PhotoGrid } from '../components/PhotoGrid';
import { Lightbox } from '../components/Lightbox';
import type { GalleryPhoto } from '../types';

/** معرض الصور العام: أحدث الصور أولاً، مع فلتر بالمباراة و"عرض المزيد" */
export function GalleryPage() {
  const state = useData();
  const [matchId, setMatchId] = useState('');
  const { photos, hasMore, loading, loadingMore, error, reload, loadMore } = usePhotos({ matchId: matchId || undefined });

  const roundPhotos = useRoundPhotos();
  const [openRound, setOpenRound] = useState<number | null>(null);
  const matches = useMemo(() => sortMatches(state.matches).slice().reverse(), [state.matches]);
  const describe = (p: GalleryPhoto) => {
    const m = p.matchId ? state.matches.find((x) => x.id === p.matchId) : undefined;
    return m ? { label: matchLabel(state, m), href: `#/match/${m.id}` } : undefined;
  };

  return (
    <>
      <PageHead title="معرض الصور" subtitle="لقطات من مباريات الدوري بعدسة المصوّرين." />

      {roundPhotos.length > 0 && (
        <section className="round-picks" aria-labelledby="round-picks-title">
          <h2 id="round-picks-title">صورة الجولة</h2>
          <ul>
            {roundPhotos.map((p, i) => (
              <li key={p.id}>
                <button type="button" onClick={() => setOpenRound(i)} aria-label={`افتح صورة ${ROUND_LABELS[p.roundPick ?? 0] ?? 'الجولة'}`}>
                  <img src={p.thumb} alt={p.caption ?? ''} loading="lazy" decoding="async" />
                  <span className="rp-badge">{ROUND_LABELS[p.roundPick ?? 0] ?? 'الجولة'}</span>
                  {p.caption && <span className="rp-cap">{p.caption}</span>}
                </button>
              </li>
            ))}
          </ul>
          {openRound !== null && <Lightbox photos={roundPhotos} index={openRound} describe={describe} onIndex={setOpenRound} onClose={() => setOpenRound(null)} />}
        </section>
      )}

      {matches.length > 0 && (
        <div className="field" style={{ maxWidth: 360, marginBottom: 18 }}>
          <label htmlFor="gal-match">المباراة</label>
          <select id="gal-match" value={matchId} onChange={(e) => setMatchId(e.target.value)}>
            <option value="">كل الصور</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {matchLabel(state, m)} — {formatArabicDate(m.date)}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <Loading label="جارٍ تحميل الصور…" />
      ) : error && photos.length === 0 ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : photos.length === 0 ? (
        <EmptyState
          title={matchId ? 'لا توجد صور لهذه المباراة بعد' : 'لا توجد صور بعد'}
          hint={
            repository.kind === 'local'
              ? 'المعرض يعمل بعد ربط الموقع بـ Supabase.'
              : 'ستظهر هنا الصور فور رفعها من المصوّرين.'
          }
        />
      ) : (
        <>
          <PhotoGrid photos={photos} describe={describe} />
          {error && <p role="alert" className="field-hint" style={{ marginTop: 10 }}>{error}</p>}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button type="button" className="btn btn-dark" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'جارٍ التحميل…' : 'عرض المزيد'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
