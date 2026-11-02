import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ROLES, ROLE_HINTS, ROLE_LABELS, type Role } from '../lib/roles';
import { createStaffService, type StaffMember } from '../services/staff';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../auth';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/StateViews';

type Notice = { type: 'ok' | 'error'; text: string };

/** null في النسخة التجريبية (بدون Supabase) */
const staffService = supabase ? createStaffService(supabase) : null;

/** إدارة الطاقم (للأدمن): إضافة موظف بالبريد، تغيير دوره، أو إزالته */
export function StaffAdmin() {
  const auth = useAuth();
  const [members, setMembers] = useState<StaffMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('scorer');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [removing, setRemoving] = useState<StaffMember | null>(null);

  const load = useCallback(async () => {
    if (!staffService) return;
    setLoadError(null);
    const res = await staffService.list();
    if (res.ok) setMembers(res.data);
    else setLoadError(res.error);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!staffService) {
    return (
      <div className="admin-grid" style={{ marginTop: 16 }}>
        <section className="card admin-panel">
          <h2>الطاقم</h2>
          <p>إدارة الطاقم من اللوحة تعمل بعد ربط الموقع بـ Supabase (النسخة التجريبية ليس فيها حسابات حقيقية).</p>
        </section>
      </div>
    );
  }

  const run = async (op: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) => {
    setBusy(true);
    try {
      const res = await op();
      setNotice(res.ok ? { type: 'ok', text: res.message } : { type: 'error', text: res.error });
      if (res.ok) await load();
      return res.ok;
    } finally {
      setBusy(false);
    }
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run(() => staffService!.save(email, role, name));
    if (ok) {
      setEmail('');
      setName('');
    }
  };

  const changeRole = (m: StaffMember, next: Role) => {
    if (next === m.role) return;
    void run(() => staffService!.save(m.email, next, m.name ?? ''));
  };

  const confirmRemove = async () => {
    const target = removing;
    if (!target) return;
    await run(() => staffService!.remove(target.userId));
    setRemoving(null);
  };

  const me = auth.email?.toLowerCase();

  return (
    <div className="admin-grid" style={{ marginTop: 16 }}>
      <section className="card admin-panel" aria-labelledby="staff-form-title">
        <h2 id="staff-form-title">إضافة موظف</h2>
        <p className="field-hint">
          أنشئ حسابه أولاً من Supabase ← Authentication ← Users ← Add user (بريد وكلمة مرور، مع تفعيل Auto Confirm User)،
          ثم اكتب بريده هنا واختر دوره. لو كان مضافاً من قبل فهذا النموذج يغيّر دوره.
        </p>
        <form className="form-grid" onSubmit={add} noValidate>
          <div className="field">
            <label htmlFor="staff-new-email">البريد الإلكتروني</label>
            <input id="staff-new-email" type="text" inputMode="email" dir="ltr" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
          </div>
          <div className="field">
            <label htmlFor="staff-new-name">الاسم (اختياري)</label>
            <input id="staff-new-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} disabled={busy} />
          </div>
          <div className="field">
            <label htmlFor="staff-new-role">الدور</label>
            <select id="staff-new-role" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={busy}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <span className="field-hint">{ROLE_HINTS[role]}</span>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !email.trim()}>{busy ? 'جارٍ الحفظ…' : 'حفظ الموظف'}</button>
        </form>
        {notice && (
          <div className={`toast ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="إغلاق الرسالة">✕</button>
          </div>
        )}
      </section>

      <section className="card admin-panel" aria-labelledby="staff-list-title">
        <h2 id="staff-list-title">الطاقم{members ? ` (${members.length})` : ''}</h2>
        {loadError ? (
          <p role="alert" style={{ color: 'var(--danger)' }}>{loadError} <button type="button" className="btn" onClick={() => void load()}>إعادة المحاولة</button></p>
        ) : members === null ? (
          <p>جارٍ التحميل…</p>
        ) : members.length === 0 ? (
          <EmptyState title="لا يوجد طاقم بعد" />
        ) : (
          <ul className="event-list">
            {members.map((m) => {
              const isMe = m.email.toLowerCase() === me;
              return (
                <li key={m.userId} className="event-item">
                  <div className="info">
                    <strong>{m.name || m.email}</strong>
                    {isMe && <span className="chip">أنت</span>}
                  </div>
                  <span className="sub" dir="ltr" style={{ textAlign: 'start' }}>{m.email}</span>
                  <div className="actions staff-actions">
                    <select
                      aria-label={`دور ${m.name || m.email}`}
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value as Role)}
                      disabled={busy || isMe}
                      title={isMe ? 'لا يمكنك تغيير دور حسابك' : ROLE_HINTS[m.role]}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    {!isMe && <button type="button" className="btn btn-danger" onClick={() => setRemoving(m)} disabled={busy}>إزالة</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <ul className="field-hint role-guide" style={{ marginTop: 14 }}>
          {ROLES.map((r) => <li key={r}><strong>{ROLE_LABELS[r]}:</strong> {ROLE_HINTS[r]}</li>)}
        </ul>
      </section>

      <ConfirmDialog
        open={removing !== null}
        title="إزالة موظف"
        confirmLabel="نعم، أزِله"
        danger
        busy={busy}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoving(null)}
      >
        سيفقد {removing?.name || removing?.email} الدخول إلى لوحة الإدارة. حسابه يبقى في Supabase ويمكنك إعادته لاحقاً. هل أنت متأكد؟
      </ConfirmDialog>
    </div>
  );
}
