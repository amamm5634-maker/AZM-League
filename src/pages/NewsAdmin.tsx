import { useState, type FormEvent } from 'react';
import { formatArabicDate } from '../lib/stats';
import { useData, useTournament } from '../store';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/StateViews';

const TAGS = ['إعلان', 'القرعة', 'نتائج', 'تقرير', 'خبر'];

type Notice = { type: 'ok' | 'error'; text: string };

/** إدارة الأخبار: نشر خبر (مع صورة اختيارية) وحذفه */
export function NewsAdmin({ isAdmin = false }: { isAdmin?: boolean }) {
  const state = useData();
  const { actions } = useTournament();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [tag, setTag] = useState(TAGS[0]);
  const [image, setImage] = useState<File | undefined>();
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const news = [...state.news].sort((a, b) => b.date.localeCompare(a.date));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await actions.addNews({ title, summary, tag, image });
      if (result.ok) {
        setNotice({ type: 'ok', text: result.message });
        setTitle('');
        setSummary('');
        setImage(undefined);
        setFileKey((k) => k + 1);
      } else {
        setNotice({ type: 'error', text: result.error });
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleLock = async (id: string, locked: boolean) => {
    setBusy(true);
    try {
      const result = await actions.setNewsLocked(id, locked);
      setNotice(result.ok ? { type: 'ok', text: result.message } : { type: 'error', text: result.error });
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setBusy(true);
    try {
      const result = await actions.deleteNews(deleteId);
      setNotice(result.ok ? { type: 'ok', text: result.message } : { type: 'error', text: result.error });
    } finally {
      setBusy(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="admin-grid" style={{ marginTop: 16 }}>
      <section className="card admin-panel" aria-labelledby="news-form-title">
        <h2 id="news-form-title">نشر خبر جديد</h2>
        <form className="form-grid" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="news-title">عنوان الخبر</label>
            <input id="news-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="field">
            <label htmlFor="news-tag">التصنيف</label>
            <select id="news-tag" value={tag} onChange={(e) => setTag(e.target.value)}>
              {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="news-summary">نص الخبر</label>
            <textarea
              id="news-summary"
              rows={5}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={2000}
              style={{ width: '100%', padding: 10, border: '1px solid #c3cbdb', borderRadius: 10, background: '#fff' }}
            />
          </div>
          <div className="field">
            <label htmlFor="news-image">صورة (اختياري)</label>
            <input
              key={fileKey}
              id="news-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImage(e.target.files?.[0])}
            />
            <span className="field-hint">JPG أو PNG أو WEBP، بحد أقصى 3 ميجابايت.</span>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'جارٍ النشر…' : 'نشر الخبر'}
          </button>
        </form>
        {notice && (
          <div className={`toast ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="إغلاق الرسالة">✕</button>
          </div>
        )}
      </section>

      <section className="card admin-panel" aria-labelledby="news-list-title">
        <h2 id="news-list-title">الأخبار المنشورة ({news.length})</h2>
        {news.length === 0 ? (
          <EmptyState title="لا توجد أخبار" />
        ) : (
          <ul className="event-list">
            {news.map((n) => (
              <li key={n.id} className="event-item">
                <div className="info">
                  <span className="chip">{n.tag}</span>
                  <strong>{n.title}</strong>
                </div>
                <span className="sub">{formatArabicDate(n.date)}{n.id.startsWith('db:') ? '' : ' · ثابت في الملفات'}</span>
                {n.locked && <span className="chip chip-soft">📌 مثبّت</span>}
                {n.id.startsWith('db:') && (
                  <div className="actions">
                    {isAdmin && (
                      <button type="button" className="btn" onClick={() => void toggleLock(n.id, !n.locked)} disabled={busy}>
                        {n.locked ? 'إلغاء التثبيت' : '📌 تثبيت'}
                      </button>
                    )}
                    {!n.locked && <button type="button" className="btn btn-danger" onClick={() => setDeleteId(n.id)} disabled={busy}>حذف</button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={deleteId !== null}
        title="حذف الخبر"
        confirmLabel="نعم، احذف"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      >
        سيتم حذف هذا الخبر نهائياً من الموقع. هل أنت متأكد؟
      </ConfirmDialog>
    </div>
  );
}
