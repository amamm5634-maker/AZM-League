import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { repository, type PhotoUsage } from '../services';
import { CAPTION_MAX, FREE_STORAGE_BYTES, formatBytes, matchLabel } from '../lib/gallery';
import { prepareUpload } from '../lib/image';
import { formatArabicDate, sortMatches } from '../lib/stats';
import { usePhotos } from '../lib/usePhotos';
import { useData } from '../store';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/StateViews';
import { ROUND_LABELS } from '../data/config';

type Notice = { type: 'ok' | 'error'; text: string };

/** رفع الصور (مع ضغطها قبل الرفع) وإدارة ما رُفع. الحذف للأدمن ومحرر الأخبار فقط. */
export function PhotosAdmin({ canDelete }: { canDelete: boolean }) {
  const state = useData();
  const { photos, hasMore, loading, loadingMore, error, reload, loadMore, setPhotos } = usePhotos({ limit: 24 });
  const [files, setFiles] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [matchId, setMatchId] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [usage, setUsage] = useState<PhotoUsage | null>(null);

  const matches = useMemo(() => sortMatches(state.matches), [state.matches]);

  const refreshUsage = useCallback(() => {
    repository.photoUsage().then(setUsage).catch(() => setUsage(null));
  }, []);
  useEffect(refreshUsage, [refreshUsage]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setNotice({ type: 'error', text: 'اختر صورة واحدة على الأقل.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    const failures: string[] = [];
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setProgress({ done: i, total: files.length });
      try {
        const prepared = await prepareUpload(f);
        const res = await repository.addPhoto({ ...prepared, matchId: matchId || undefined, caption });
        if (res.ok) ok++;
        else failures.push(`${f.name}: ${res.error}`);
      } catch (err) {
        const msg = err instanceof Error && /[\u0600-\u06FF]/.test(err.message) ? err.message : 'تعذّر معالجة الصورة.';
        failures.push(`${f.name}: ${msg}`);
      }
    }
    setProgress(null);
    setBusy(false);
    if (ok > 0) {
      reload();
      refreshUsage();
      setFiles([]);
      setFileKey((k) => k + 1);
      setCaption('');
    }
    if (failures.length === 0) setNotice({ type: 'ok', text: `تم رفع ${ok} ${ok === 1 ? 'صورة' : 'صور'}.` });
    else setNotice({ type: 'error', text: `${ok > 0 ? `تم رفع ${ok} وفشل ${failures.length}. ` : ''}${failures.slice(0, 3).join(' — ')}` });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setBusy(true);
    try {
      const res = await repository.deletePhoto(deleteId);
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== deleteId));
        refreshUsage();
      }
      setNotice(res.ok ? { type: 'ok', text: res.message } : { type: 'error', text: res.error });
    } finally {
      setBusy(false);
      setDeleteId(null);
    }
  };

  const pickRound = async (id: string, value: string) => {
    const round = value ? Number(value) : null;
    setBusy(true);
    try {
      const res = await repository.setRoundPhoto(id, round);
      if (res.ok) {
        // يحدّث القائمة محلياً: صورة واحدة فقط لكل جولة
        setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, roundPick: round ?? undefined } : round !== null && p.roundPick === round ? { ...p, roundPick: undefined } : p)));
      }
      setNotice(res.ok ? { type: 'ok', text: res.message } : { type: 'error', text: res.error });
    } finally {
      setBusy(false);
    }
  };

  const usedPct = usage ? Math.min(100, Math.round((usage.bytes / FREE_STORAGE_BYTES) * 100)) : 0;

  return (
    <div className="admin-grid" style={{ marginTop: 16 }}>
      <section className="card admin-panel" aria-labelledby="photo-form-title">
        <h2 id="photo-form-title">رفع صور</h2>
        {repository.kind === 'local' && (
          <p className="field-hint" role="note">النسخة التجريبية: رفع الصور يتطلب ربط Supabase.</p>
        )}
        <form className="form-grid" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="photo-files">الصور</label>
            <input
              key={fileKey}
              id="photo-files"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              disabled={busy}
            />
            <span className="field-hint">
              يمكنك اختيار عدة صور معاً. تُصغَّر وتُضغط تلقائياً قبل الرفع (نحو 300 ك.ب للصورة) لحماية المساحة المجانية.
            </span>
          </div>
          <div className="field">
            <label htmlFor="photo-match">المباراة (اختياري)</label>
            <select id="photo-match" value={matchId} onChange={(e) => setMatchId(e.target.value)} disabled={busy}>
              <option value="">بدون مباراة محددة</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>{matchLabel(state, m)} — {formatArabicDate(m.date)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="photo-caption">تعليق (اختياري، يُطبَّق على كل الصور المختارة)</label>
            <input id="photo-caption" type="text" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={CAPTION_MAX} disabled={busy} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || files.length === 0}>
            {progress ? `جارٍ الرفع… ${progress.done + 1} / ${progress.total}` : files.length > 1 ? `رفع ${files.length} صور` : 'رفع الصورة'}
          </button>
        </form>
        {notice && (
          <div className={`toast ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="إغلاق الرسالة">✕</button>
          </div>
        )}
        {usage && (
          <div className="usage" style={{ marginTop: 14 }}>
            <div className="usage-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usedPct} aria-label="المساحة المستخدمة للصور">
              <span style={{ width: `${usedPct}%` }} />
            </div>
            <span className="field-hint">
              {usage.count} صورة · {formatBytes(usage.bytes)} من 500 م.ب (المعرض فقط؛ صور الأخبار تُحسب أيضاً من نفس المساحة)
            </span>
          </div>
        )}
      </section>

      <section className="card admin-panel" aria-labelledby="photo-list-title">
        <h2 id="photo-list-title">الصور المرفوعة</h2>
        {loading ? (
          <p>جارٍ التحميل…</p>
        ) : error && photos.length === 0 ? (
          <p role="alert" style={{ color: 'var(--danger)' }}>{error} <button type="button" className="btn" onClick={reload}>إعادة المحاولة</button></p>
        ) : photos.length === 0 ? (
          <EmptyState title="لا توجد صور بعد" />
        ) : (
          <>
            <ul className="admin-photos">
              {photos.map((p) => {
                const m = p.matchId ? state.matches.find((x) => x.id === p.matchId) : undefined;
                return (
                  <li key={p.id} className="admin-photo">
                    <img src={p.thumb} alt={p.caption ?? ''} loading="lazy" />
                    <div className="sub">
                      {p.caption && <strong>{p.caption}</strong>}
                      <span>{m ? matchLabel(state, m) : 'بدون مباراة'} · {formatArabicDate(p.createdAt.slice(0, 10))}</span>
                    </div>
                    {canDelete && (
                      <select aria-label="صورة الجولة" className="round-select" value={p.roundPick ?? ''} onChange={(e) => void pickRound(p.id, e.target.value)} disabled={busy}>
                        <option value="">ليست صورة جولة</option>
                        {Object.entries(ROUND_LABELS).map(([n, label]) => (
                          <option key={n} value={n}>صورة {label}</option>
                        ))}
                      </select>
                    )}
                    {canDelete && (
                      <button type="button" className="btn btn-danger" onClick={() => setDeleteId(p.id)} disabled={busy}>حذف</button>
                    )}
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <button type="button" className="btn" style={{ marginTop: 12 }} onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'جارٍ التحميل…' : 'عرض المزيد'}
              </button>
            )}
          </>
        )}
        {!canDelete && <p className="field-hint" style={{ marginTop: 10 }}>حذف الصور من صلاحية الأدمن ومحرر الأخبار. إن رفعت صورة بالخطأ فأبلغ الأدمن.</p>}
      </section>

      <ConfirmDialog
        open={deleteId !== null}
        title="حذف الصورة"
        confirmLabel="نعم، احذف"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      >
        ستُحذف هذه الصورة نهائياً من المعرض ومن التخزين. هل أنت متأكد؟
      </ConfirmDialog>
    </div>
  );
}
