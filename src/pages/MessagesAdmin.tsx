import { useCallback, useEffect, useState } from 'react';
import { repository } from '../services';
import { matchLabel } from '../lib/gallery';
import { useData } from '../store';
import { EmptyState } from '../components/StateViews';
import type { MatchMessage } from '../types';

/** مراجعة رسائل المدرجات: قبول أو رفض. للأدمن ومحرر الأخبار. */
export function MessagesAdmin() {
  const state = useData();
  const [items, setItems] = useState<MatchMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    repository
      .loadPendingMessages()
      .then(setItems)
      .catch(() => setError('تعذّر تحميل الرسائل.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    const res = await repository.reviewMessage(id, status);
    setBusyId(null);
    if (res.ok) {
      setItems((prev) => prev.filter((m) => m.id !== id));
      setNotice(res.message);
    } else {
      setNotice(res.error);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <section className="card admin-panel" aria-labelledby="msgs-title">
        <h2 id="msgs-title">رسائل المدرجات بانتظار المراجعة {items.length > 0 && <span className="chip">{items.length}</span>}</h2>
        {repository.kind === 'local' && <p className="field-hint" role="note">النسخة التجريبية: الرسائل تتطلب ربط Supabase.</p>}
        <button type="button" className="btn" onClick={load} disabled={loading}>تحديث</button>
        {notice && <p role="status" className="field-hint" style={{ marginTop: 8 }}>{notice}</p>}
        {loading ? (
          <p>جارٍ التحميل…</p>
        ) : error ? (
          <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>
        ) : items.length === 0 ? (
          <EmptyState title="لا توجد رسائل بانتظار المراجعة" />
        ) : (
          <ul className="msg-queue">
            {items.map((m) => {
              const match = state.matches.find((x) => x.id === m.matchId);
              return (
                <li key={m.id} className="msg-item">
                  <div>
                    <p className="msg-body">{m.body}</p>
                    <small>{m.author} · {match ? matchLabel(state, match) : m.matchId}</small>
                  </div>
                  <div className="row">
                    <button type="button" className="btn btn-primary" onClick={() => void decide(m.id, 'approved')} disabled={busyId === m.id}>قبول</button>
                    <button type="button" className="btn btn-danger" onClick={() => void decide(m.id, 'rejected')} disabled={busyId === m.id}>رفض</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
