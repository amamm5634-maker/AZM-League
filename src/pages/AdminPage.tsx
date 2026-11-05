import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { EventInput, Match, MatchEvent, MatchStatus, TournamentState } from '../types';
import { ADMIN_DEMO_CODE, MATCH_STATUS_LABELS, ROUND_LABELS, TOURNAMENT } from '../data/config';
import { eventsForMatch, formatArabicDate, playerById, sortMatches, teamById } from '../lib/stats';
import { repository, type Result } from '../services';
import { ROLE_LABELS, useAuth, type Role } from '../auth';
import { useData, useTournament } from '../store';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState, Loading } from '../components/StateViews';
import { QuickScorer } from './QuickScorer';
import { NewsAdmin } from './NewsAdmin';
import { PhotosAdmin } from './PhotosAdmin';
import { StaffAdmin } from './StaffAdmin';
import { MessagesAdmin } from './MessagesAdmin';
import { LineupsAdmin } from './LineupsAdmin';
import { tabsForRole, type AdminTab } from '../lib/roles';
import { GateOpening, GateScene } from '../components/Gate';
import '../admin.css';

const SESSION_KEY = 'university-league-demo:admin';

type Notice = { type: 'ok' | 'error'; text: string };
type Run = (p: Promise<Result<TournamentState>>) => Promise<Result<TournamentState>>;

function readSession(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function AdminPage() {
  const auth = useAuth();
  const [authed, setAuthed] = useState<boolean>(readSession);
  // بوابة السياج: تنفتح بحركة بعد تسجيل دخول ناجح في هذه الجلسة (لا عند فتح الصفحة وأنت داخل أصلاً)
  const wasOut = useRef(false);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    if (!auth.enabled || auth.loading) return;
    if (!auth.email) {
      wasOut.current = true;
      return;
    }
    if (!wasOut.current) return;
    wasOut.current = false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setOpening(true);
    const t = window.setTimeout(() => setOpening(false), 1700);
    return () => window.clearTimeout(t);
  }, [auth.enabled, auth.loading, auth.email]);

  // الوضع الحي: تسجيل دخول حقيقي بالبريد وكلمة المرور وأدوار من قاعدة البيانات
  if (auth.enabled) {
    if (auth.loading) return <Loading label="جارٍ التحقق من الحساب…" />;
    if (!auth.email) return <GateScene><StaffLogin /></GateScene>;
    if (!auth.role) return <NoAccess email={auth.email} onLogout={auth.signOut} />;
    return (
      <>
        <Panel role={auth.role} who={auth.name ?? auth.email} onLogout={auth.signOut} />
        {opening && <GateOpening />}
      </>
    );
  }

  // الوضع التجريبي: رمز ثابت (للعرض فقط)
  const logout = () => {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* لا شيء */
    }
    setAuthed(false);
  };

  return authed ? <Panel role="admin" who="وضع تجريبي" onLogout={logout} /> : <Login onSuccess={() => setAuthed(true)} />;
}

/* ---------------- الدخول الحقيقي (Supabase) ---------------- */
function StaffLogin() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('اكتب البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await auth.signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <form className="card login-card" onSubmit={submit} noValidate>
      <h1>لوحة إدارة {TOURNAMENT.name}</h1>
      <p style={{ color: 'var(--muted)' }}>للمخوّلين فقط: الأدمن، محرر الأخبار، المصوّر، ومسجّل النتائج.</p>
      <div className="field">
        <label htmlFor="staff-email">البريد الإلكتروني</label>
        <input id="staff-email" type="text" inputMode="email" autoComplete="username" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="staff-pass">كلمة المرور</label>
        <input id="staff-pass" type="password" autoComplete="current-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>}
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}</button>
      <a className="link-more" href="#/">العودة إلى الموقع</a>
    </form>
  );
}

function NoAccess({ email, onLogout }: { email: string; onLogout: () => void | Promise<void> }) {
  return (
    <div className="card login-card">
      <h1>لا توجد صلاحية لهذا الحساب</h1>
      <p>الحساب <strong dir="ltr">{email}</strong> غير مضاف كموظف. اطلب من الأدمن إضافتك وتحديد دورك.</p>
      <button type="button" className="btn btn-dark" onClick={() => void onLogout()}>تسجيل الخروج</button>
    </div>
  );
}

/* ---------------- الإطار: تبويبات حسب الدور ---------------- */
function Panel({ role, who, onLogout }: { role: Role; who: string; onLogout: () => void | Promise<void> }) {
  const tabs = tabsForRole(role); // كل دور يرى أقسامه فقط (تعريفها في lib/roles.ts)
  const [tab, setTab] = useState<AdminTab>(tabs[0]?.key ?? 'results');

  return (
    <>
      <div className="admin-top">
        <span className="who">{who} · {ROLE_LABELS[role]}</span>
        <div className="admin-tabs" role="group" aria-label="أقسام اللوحة">
          {tabs.map((t) => (
            <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
        <button type="button" className="btn" onClick={() => void onLogout()}>تسجيل الخروج</button>
      </div>

      {tabs.length === 0 ? (
        <EmptyState title="لا توجد أقسام متاحة لدورك بعد" hint="اطلب من الأدمن مراجعة دورك." />
      ) : tab === 'news' ? (
        <NewsAdmin />
      ) : tab === 'photos' ? (
        <PhotosAdmin canDelete={role === 'admin' || role === 'editor'} />
      ) : tab === 'messages' ? (
        <MessagesAdmin />
      ) : tab === 'staff' ? (
        <StaffAdmin />
      ) : tab === 'quick' ? (
        <QuickScorer />
      ) : tab === 'lineups' ? (
        <LineupsAdmin isAdmin={role === 'admin'} />
      ) : (
        <Dashboard />
      )}
    </>
  );
}

/* ---------------- شاشة الدخول التجريبي ---------------- */
function Login({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim() !== ADMIN_DEMO_CODE) {
      setError('الرمز غير صحيح. استخدم رمز الدخول التجريبي الموضح أعلاه.');
      return;
    }
    try {
      window.sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* نتابع حتى لو تعذّر الحفظ */
    }
    onSuccess();
  };

  return (
    <form className="card login-card" onSubmit={submit} noValidate>
      <h1>لوحة الإدارة — نسخة تجريبية</h1>
      <div className="demo-warning" role="note">
        <strong>دخول تجريبي للعرض فقط.</strong> هذه الشاشة ليست مصادقة حقيقية ولا تحمي أي بيانات. رمز العرض:{' '}
        <code dir="ltr">{ADMIN_DEMO_CODE}</code>
      </div>
      <div className="field">
        <label htmlFor="admin-code">رمز الدخول التجريبي</label>
        <input
          id="admin-code"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'admin-code-error' : undefined}
        />
        {error && (
          <p id="admin-code-error" role="alert" style={{ color: 'var(--danger)', fontWeight: 600 }}>
            {error}
          </p>
        )}
      </div>
      <button type="submit" className="btn btn-primary">دخول تجريبي</button>
      <a className="link-more" href="#/">العودة إلى الموقع</a>
    </form>
  );
}

/* ---------------- لوحة التحكم ---------------- */
function Dashboard() {
  const state = useData();
  const { actions } = useTournament();
  const [filter, setFilter] = useState<'all' | MatchStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `${repository.kind === 'local' ? 'لوحة الإدارة — نسخة تجريبية' : 'لوحة الإدارة'} — ${TOURNAMENT.name}`;
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const run: Run = async (promise) => {
    setBusy(true);
    try {
      const result = await promise;
      setNotice(result.ok ? { type: 'ok', text: result.message } : { type: 'error', text: result.error });
      return result;
    } finally {
      setBusy(false);
    }
  };

  const matches = useMemo(
    () => sortMatches(state.matches).filter((m) => filter === 'all' || m.status === filter),
    [state.matches, filter],
  );
  const counts = {
    completed: state.matches.filter((m) => m.status === 'completed').length,
    live: state.matches.filter((m) => m.status === 'live').length,
    scheduled: state.matches.filter((m) => m.status === 'scheduled').length,
  };
  const selected = state.matches.find((m) => m.id === selectedId);

  const select = (id: string) => {
    setSelectedId(id);
    window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const doReset = async () => {
    const result = await run(actions.reset());
    setConfirmReset(false);
    if (result.ok) setSelectedId(null);
  };

  return (
    <>
      <header className="admin-bar">
        <div>
          <h1>{repository.kind === 'local' ? 'لوحة الإدارة — نسخة تجريبية' : 'النتائج والأهداف'}</h1>
          <p>
            سجّل الأهداف والنتائج وستتحدث صفحات الموقع فوراً.
            {repository.kind === 'local' && ' التخزين تجريبي في هذا المتصفح فقط.'}
          </p>
        </div>
        <div className="row">
          <a className="btn btn-ghost" href="#/">عرض الموقع</a>
        </div>
      </header>

      {notice && (
        <div className={`toast ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="إغلاق الرسالة">✕</button>
        </div>
      )}

      <div className="admin-grid">
        <section className="card admin-panel" aria-labelledby="matches-title">
          <h2 id="matches-title">المباريات</h2>
          <div className="admin-summary">
            <div><b>{counts.scheduled}</b><span>قادمة</span></div>
            <div><b>{counts.live}</b><span>جارية</span></div>
            <div><b>{counts.completed}</b><span>منتهية</span></div>
          </div>
          <div className="admin-tabs" role="group" aria-label="تصفية حسب الحالة">
            {(['all', 'scheduled', 'live', 'completed'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
                {s === 'all' ? 'الكل' : MATCH_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {matches.length === 0 ? (
            <EmptyState title="لا توجد مباريات" hint="غيّر التصفية لعرض مباريات أخرى." />
          ) : (
            <div className="admin-match-list">
              {matches.map((m) => (
                <MatchRow key={m.id} match={m} selected={m.id === selectedId} onSelect={() => select(m.id)} />
              ))}
            </div>
          )}

          {repository.kind === 'local' && (
            <div className="danger-zone">
              <p>إعادة ضبط البيانات التجريبية ستحذف كل التعديلات وتعيد البيانات الأصلية.</p>
              <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)} disabled={busy}>
                إعادة ضبط البيانات التجريبية
              </button>
            </div>
          )}
        </section>

        <div ref={panelRef}>
          {selected ? (
            <MatchPanel key={selected.id} match={selected} run={run} busy={busy} />
          ) : (
            <EmptyState title="اختر مباراة للإدارة" hint="اضغط على أي مباراة من القائمة لتسجيل نتيجتها وأهدافها." />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="تأكيد إعادة الضبط"
        confirmLabel="نعم، أعد الضبط"
        danger
        busy={busy}
        onConfirm={doReset}
        onCancel={() => setConfirmReset(false)}
      >
        سيتم حذف جميع الأهداف والنتائج التي سجلتها واستعادة البيانات التجريبية الأصلية. هل تريد المتابعة؟
      </ConfirmDialog>
    </>
  );
}

function MatchRow({ match, selected, onSelect }: { match: Match; selected: boolean; onSelect: () => void }) {
  const state = useData();
  const home = teamById(state, match.homeId);
  const away = teamById(state, match.awayId);
  return (
    <button type="button" className="admin-match" aria-pressed={selected} onClick={onSelect}>
      <span className="teams">{home?.nickname} × {away?.nickname}</span>
      <span className="res">
        {match.status !== 'scheduled' && (
          <span dir="ltr">{match.homeScore} - {match.awayScore}</span>
        )}
        <span className={`chip st-${match.status}`}>{MATCH_STATUS_LABELS[match.status]}</span>
      </span>
      <span className="when">{formatArabicDate(match.date)} · {match.time} · {ROUND_LABELS[match.round]}</span>
    </button>
  );
}

/* ---------------- إدارة مباراة واحدة ---------------- */
interface EventForm {
  teamId: string;
  scorerId: string;
  assistId: string;
  minute: string;
}

function MatchPanel({ match, run, busy }: { match: Match; run: Run; busy: boolean }) {
  const state = useData();
  const { actions } = useTournament();
  const home = teamById(state, match.homeId);
  const away = teamById(state, match.awayId);

  const [homeText, setHomeText] = useState(String(match.homeScore));
  const [awayText, setAwayText] = useState(String(match.awayScore));
  const [localError, setLocalError] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>({ teamId: match.homeId, scorerId: '', assistId: '', minute: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // تزامن حقول النتيجة عند تغيّرها بسبب تسجيل/حذف هدف
  useEffect(() => {
    setHomeText(String(match.homeScore));
    setAwayText(String(match.awayScore));
  }, [match.homeScore, match.awayScore]);

  const events = eventsForMatch(state, match.id);
  const squad = state.players.filter((p) => p.teamId === form.teamId).sort((a, b) => a.number - b.number);
  const assistOptions = squad.filter((p) => p.id !== form.scorerId);

  const saveScore = async (e: FormEvent) => {
    e.preventDefault();
    if (homeText.trim() === '' || awayText.trim() === '') {
      setLocalError('يرجى إدخال نتيجة الفريقين.');
      return;
    }
    setLocalError(null);
    await run(actions.setScore(match.id, Number(homeText), Number(awayText)));
  };

  const resetForm = (teamId: string = form.teamId) => {
    setForm({ teamId, scorerId: '', assistId: '', minute: '' });
    setEditingId(null);
    setLocalError(null);
  };

  const submitEvent = async (e: FormEvent) => {
    e.preventDefault();
    const minuteText = form.minute.trim();
    const input: EventInput = {
      matchId: match.id,
      teamId: form.teamId,
      scorerId: form.scorerId,
      assistId: form.assistId || undefined,
      minute: minuteText === '' ? undefined : Number(minuteText),
    };
    const result = editingId ? await run(actions.updateEvent(editingId, input)) : await run(actions.addEvent(input));
    if (result.ok) resetForm();
  };

  const startEdit = (ev: MatchEvent) => {
    setEditingId(ev.id);
    setForm({
      teamId: ev.teamId,
      scorerId: ev.scorerId,
      assistId: ev.assistId ?? '',
      minute: ev.minute != null ? String(ev.minute) : '',
    });
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    const result = await run(actions.deleteEvent(id));
    setDeleteId(null);
    if (result.ok && editingId === id) resetForm();
  };

  const finish = () => run(actions.completeMatch(match.id));

  return (
    <div className="admin-panel" style={{ display: 'grid', gap: 16 }}>
      <section className="card" aria-labelledby="mp-title">
        <h2 id="mp-title">{home?.name} × {away?.name}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 12 }}>
          {formatArabicDate(match.date)} · {match.time} · {match.venue}{' '}
          <span className={`chip st-${match.status}`}>{MATCH_STATUS_LABELS[match.status]}</span>
        </p>

        <form onSubmit={saveScore} noValidate aria-label="تعديل النتيجة">
          <div className="score-inputs">
            <div className="field">
              <label htmlFor="score-home">{home?.nickname}</label>
              <input id="score-home" type="number" inputMode="numeric" min={0} max={99} value={homeText} onChange={(e) => setHomeText(e.target.value)} />
            </div>
            <span className="dash" aria-hidden="true">–</span>
            <div className="field">
              <label htmlFor="score-away">{away?.nickname}</label>
              <input id="score-away" type="number" inputMode="numeric" min={0} max={99} value={awayText} onChange={(e) => setAwayText(e.target.value)} />
            </div>
          </div>
          {localError && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 600, marginTop: 8 }}>{localError}</p>}
          <p className="field-hint" style={{ marginTop: 6 }}>تتغير النتيجة تلقائياً عند تسجيل هدف، ويمكنك تعديلها يدوياً من هنا.</p>
          <div className="form-actions" style={{ marginTop: 10 }}>
            <button type="submit" className="btn btn-dark" disabled={busy}>حفظ النتيجة</button>
            <button type="button" className="btn btn-primary" onClick={finish} disabled={busy || match.status === 'completed'}>
              {match.status === 'completed' ? 'المباراة منتهية' : 'إنهاء المباراة'}
            </button>
          </div>
        </form>
      </section>

      <section className="card" aria-labelledby="motm-title">
        <h2 id="motm-title">أفضل لاعب في المباراة</h2>
        <div className="field">
          <label htmlFor="motm">اختر اللاعب</label>
          <select
            id="motm"
            value={match.motmId ?? ''}
            disabled={busy}
            onChange={(e) => run(actions.setManOfMatch(match.id, e.target.value || null))}
          >
            <option value="">— بدون —</option>
            {[match.homeId, match.awayId].map((tid) => (
              <optgroup key={tid} label={tid === match.homeId ? home?.name : away?.name}>
                {state.players
                  .filter((p) => p.teamId === tid)
                  .sort((a, b) => a.number - b.number)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.number} — {p.name}</option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
      </section>

      <section className="card" aria-labelledby="ev-form-title">
        <h2 id="ev-form-title">{editingId ? 'تعديل الهدف' : 'تسجيل هدف'}</h2>
        <form ref={formRef} onSubmit={submitEvent} noValidate className="form-grid">
          <div className="field">
            <label htmlFor="ev-team">الفريق</label>
            <select
              id="ev-team"
              value={form.teamId}
              onChange={(e) => setForm({ teamId: e.target.value, scorerId: '', assistId: '', minute: form.minute })}
            >
              <option value={match.homeId}>{home?.name}</option>
              <option value={match.awayId}>{away?.name}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-scorer">اللاعب المسجّل</label>
            <select
              id="ev-scorer"
              value={form.scorerId}
              onChange={(e) =>
                setForm((f) => ({ ...f, scorerId: e.target.value, assistId: f.assistId === e.target.value ? '' : f.assistId }))
              }
            >
              <option value="">— اختر اللاعب —</option>
              {squad.map((p) => (
                <option key={p.id} value={p.id}>{p.number} · {p.name} ({p.position})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-assist">صانع الهدف (اختياري)</label>
            <select id="ev-assist" value={form.assistId} onChange={(e) => setForm((f) => ({ ...f, assistId: e.target.value }))}>
              <option value="">بدون صانع هدف</option>
              {assistOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.number} · {p.name} ({p.position})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-minute">دقيقة الهدف (اختياري)</label>
            <input
              id="ev-minute"
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              value={form.minute}
              onChange={(e) => setForm((f) => ({ ...f, minute: e.target.value }))}
              placeholder="مثال: 37"
            />
            <span className="field-hint">رقم بين 1 و120.</span>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {editingId ? 'حفظ التعديل' : 'تسجيل الهدف'}
            </button>
            {editingId && (
              <button type="button" className="btn" onClick={() => resetForm()}>إلغاء التعديل</button>
            )}
          </div>
        </form>
      </section>

      <section className="card" aria-labelledby="ev-list-title">
        <h2 id="ev-list-title">أهداف المباراة ({events.length})</h2>
        {events.length === 0 ? (
          <EmptyState title="لا توجد أهداف مسجّلة" hint="سجّل أول هدف من النموذج أعلاه." />
        ) : (
          <ul className="event-list">
            {events.map((ev) => {
              const scorer = playerById(state, ev.scorerId);
              const assister = ev.assistId ? playerById(state, ev.assistId) : undefined;
              const team = teamById(state, ev.teamId);
              return (
                <li key={ev.id} className={`event-item${editingId === ev.id ? ' editing' : ''}`}>
                  <div className="info">
                    <span className="min" dir="ltr">{ev.minute != null ? `${ev.minute}'` : '—'}</span>
                    <strong>{scorer?.name}</strong>
                    <span className="sub">{team?.name}{assister ? ` · صناعة: ${assister.name}` : ''}</span>
                  </div>
                  <div className="actions">
                    <button type="button" className="btn" onClick={() => startEdit(ev)} disabled={busy}>تعديل</button>
                    <button type="button" className="btn btn-danger" onClick={() => setDeleteId(ev.id)} disabled={busy}>حذف</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={deleteId !== null}
        title="حذف الهدف"
        confirmLabel="نعم، احذف"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      >
        سيتم حذف هذا الهدف وتحديث النتيجة والترتيب والإحصاءات. هل أنت متأكد؟
      </ConfirmDialog>
    </div>
  );
}
