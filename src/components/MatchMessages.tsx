import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { repository } from '../services';
import { assetUrl } from '../lib/asset';
import { deviceId } from '../lib/device';
import { formatArabicDate } from '../lib/stats';
import type { MatchMessage } from '../types';

const MAX = 140;

/** من 6 مساءً إلى 6 صباحاً نعرض المدرجات الليلية، وفي النهار مدرجات الغروب */
function standsPhoto(): string {
  const h = new Date().getHours();
  const night = h >= 18 || h < 6;
  return `url("${assetUrl(`images/${night ? 'stands-night' : 'stands-sunset'}.jpg`)}")`;
}

/** مدرجات المباراة: رسائل تشجيع من الجمهور تظهر بعد موافقة الإدارة */
export function MatchMessages({ matchId }: { matchId: string }) {
  const [messages, setMessages] = useState<MatchMessage[]>([]);
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    repository.loadMessages(matchId).then(setMessages).catch(() => undefined);
  }, [matchId]);
  useEffect(load, [load]);

  // في النسخة التجريبية (بدون Supabase) نخفي القسم كاملاً
  if (repository.kind === 'local') return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (text.length < 3) {
      setNotice({ type: 'error', text: 'اكتب رسالة من 3 أحرف على الأقل.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    const res = await repository.submitMessage(matchId, author.trim(), text, deviceId());
    setBusy(false);
    if (res.ok) {
      setBody('');
      setNotice({ type: 'ok', text: res.message });
    } else {
      setNotice({ type: 'error', text: res.error });
    }
  };

  return (
    <section className="section stands" aria-labelledby="stands-title" style={{ '--stands-photo': standsPhoto() } as CSSProperties}>
      <div className="section-title"><h2 id="stands-title">مدرجات المباراة</h2></div>
      <form className="card stands-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="stands-author">اسمك (اختياري)</label>
          <input id="stands-author" type="text" maxLength={24} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="مشجع" disabled={busy} />
        </div>
        <div className="field">
          <label htmlFor="stands-body">رسالتك للفريقين</label>
          <textarea id="stands-body" rows={2} maxLength={MAX} value={body} onChange={(e) => setBody(e.target.value)} placeholder="بالتوفيق يا شباب، نتمنى نشوف لعب جميل…" disabled={busy} />
          <span className="field-hint" dir="ltr" style={{ textAlign: 'end' }}>{body.length}/{MAX}</span>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || body.trim().length < 3}>{busy ? 'جارٍ الإرسال…' : 'إرسال للمدرجات'}</button>
        {notice && <p role={notice.type === 'error' ? 'alert' : 'status'} className={`stands-notice ${notice.type}`}>{notice.text}</p>}
        <p className="field-hint">الرسائل تُراجَع قبل نشرها. التزم بالاحترام وتجنّب الإساءة.</p>
      </form>
      {messages.length > 0 ? (
        <ul className="stands-list">
          {messages.map((m) => (
            <li key={m.id} className="card">
              <p>{m.body}</p>
              <small>{m.author} · {formatArabicDate(m.createdAt.slice(0, 10))}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="field-hint">لا رسائل بعد. كن أول من يشجّع!</p>
      )}
    </section>
  );
}
