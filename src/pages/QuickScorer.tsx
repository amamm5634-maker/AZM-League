import { useEffect, useMemo, useRef, useState } from 'react';
import type { Match, Player } from '../types';
import { GROUP_LABELS, MATCH_STATUS_LABELS } from '../data/config';
import { eventsForMatch, formatArabicDate, playerById, sortMatches, teamById } from '../lib/stats';
import { useData, useTournament } from '../store';
import { TeamBadge } from '../components/TeamBadge';

type Side = 'home' | 'away';
type Notice = { type: 'ok' | 'error'; text: string };

/** وضع الميدان: شاشة بأزرار كبيرة لتسجيل مباراة واحدة بسرعة من الموبايل */
export function QuickScorer() {
  const state = useData();
  const { actions } = useTournament();
  const open = useMemo(() => sortMatches(state.matches).filter((m) => m.status !== 'completed'), [state.matches]);
  const [matchId, setMatchId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [picking, setPicking] = useState<{ side: Side; scorer?: Player } | null>(null);
  const [minute, setMinute] = useState('');
  const [lastSide, setLastSide] = useState<Side | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // نختار تلقائياً المباراة الجارية، وإلا أقرب مباراة قادمة
  useEffect(() => {
    if (matchId && state.matches.some((m) => m.id === matchId)) return;
    const live = open.find((m) => m.status === 'live');
    setMatchId((live ?? open[0])?.id ?? '');
  }, [open, matchId, state.matches]);

  // منع انطفاء الشاشة أثناء المباراة (إن كان المتصفح يدعم ذلك)
  const lock = useRef<{ release: () => Promise<void> } | null>(null);
  useEffect(() => {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    wl?.request('screen').then((l) => { lock.current = l; }).catch(() => undefined);
    return () => { void lock.current?.release().catch(() => undefined); };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!confirmEnd) return;
    const t = window.setTimeout(() => setConfirmEnd(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmEnd]);

  const match: Match | undefined = state.matches.find((m) => m.id === matchId);
  if (!match) {
    return <p className="card" style={{ marginTop: 14 }}>لا توجد مباريات متاحة للتسجيل الآن. يظهر الجدول بعد القرعة.</p>;
  }

  const home = teamById(state, match.homeId);
  const away = teamById(state, match.awayId);
  const teamOf = (side: Side) => (side === 'home' ? home : away);
  const squad = (side: Side) => state.players.filter((p) => p.teamId === teamOf(side)?.id).sort((a, b) => a.number - b.number);
  const goals = eventsForMatch(state, match.id);

  async function run(promise: Promise<{ ok: boolean; message?: string; error?: string }>) {
    setBusy(true);
    try {
      const r = await promise;
      setNotice(r.ok ? { type: 'ok', text: r.message ?? 'تم' } : { type: 'error', text: r.error ?? 'تعذّر الحفظ' });
      if (r.ok) navigator.vibrate?.(35);
      return r.ok;
    } finally {
      setBusy(false);
    }
  }

  const m = match;
  async function saveGoal(side: Side, scorer: Player | undefined, assist?: Player) {
    const team = teamOf(side);
    if (!team) return;
    const min = minute.trim() === '' ? undefined : Number(minute);
    const ok = scorer
      ? await run(actions.addEvent({ matchId: m.id, teamId: team.id, scorerId: scorer.id, assistId: assist?.id, minute: min }))
      : await run(actions.setScore(m.id, m.homeScore + (side === 'home' ? 1 : 0), m.awayScore + (side === 'away' ? 1 : 0)));
    if (ok) {
      setLastSide(side);
      setPicking(null);
      setMinute('');
    }
  }

  function onGoal(side: Side) {
    if (squad(side).length === 0) void saveGoal(side, undefined); // لا توجد قائمة لاعبين: نزيد النتيجة فقط
    else setPicking({ side });
  }

  async function undo() {
    const last = goals[goals.length - 1];
    if (last) {
      await run(actions.deleteEvent(last.id));
      return;
    }
    const side = lastSide ?? (m.homeScore >= m.awayScore ? 'home' : 'away');
    const h = Math.max(0, m.homeScore - (side === 'home' ? 1 : 0));
    const a = Math.max(0, m.awayScore - (side === 'away' ? 1 : 0));
    if (h === m.homeScore && a === m.awayScore) return;
    await run(actions.setScore(m.id, h, a));
  }

  async function finish() {
    if (!confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    setConfirmEnd(false);
    await run(actions.completeMatch(m.id));
  }

  const scorerPlayers = picking ? squad(picking.side) : [];
  const assistPlayers = picking?.scorer ? scorerPlayers.filter((p) => p.id !== picking.scorer?.id) : [];

  return (
    <div className="quick">
      <div className="field">
        <label htmlFor="q-match">المباراة</label>
        <select id="q-match" value={matchId} onChange={(e) => { setMatchId(e.target.value); setPicking(null); }}>
          {open.map((x) => (
            <option key={x.id} value={x.id}>
              {teamById(state, x.homeId)?.nickname} × {teamById(state, x.awayId)?.nickname} — {formatArabicDate(x.date)} {x.time}
            </option>
          ))}
        </select>
      </div>

      <div className="quick-board">
        <span className={`chip st-${match.status}`}>{MATCH_STATUS_LABELS[match.status]}</span>
        <span className="chip chip-soft">{GROUP_LABELS[match.group]}</span>
        <div className="quick-teams">
          {(['home', 'away'] as Side[]).map((side) => {
            const t = teamOf(side);
            const score = side === 'home' ? match.homeScore : match.awayScore;
            return (
              <div key={side} className="quick-team">
                <TeamBadge team={t} size={64} />
                <b className="qt-name">{t?.nickname}</b>
                <span className="qt-score" aria-label={`نتيجة ${t?.nickname}`}>{score}</span>
                <button type="button" className="quick-goal" disabled={busy} onClick={() => onGoal(side)}>
                  ⚽ هدف
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {notice && <div className={`toast ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}><span>{notice.text}</span></div>}

      <div className="quick-actions">
        <button type="button" className="btn" disabled={busy || (goals.length === 0 && match.homeScore + match.awayScore === 0)} onClick={() => void undo()}>
          ↩ تراجع عن آخر هدف
        </button>
        {match.status === 'scheduled' && (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void run(actions.setScore(match.id, 0, 0))}>
            ▶ بدء المباراة
          </button>
        )}
        {match.status === 'live' && (
          <button type="button" className={`btn ${confirmEnd ? 'btn-danger' : 'btn-dark'}`} disabled={busy} onClick={() => void finish()}>
            {confirmEnd ? 'اضغط مرة ثانية لتأكيد الإنهاء' : '🏁 إنهاء المباراة'}
          </button>
        )}
      </div>

      {goals.length > 0 && (
        <ol className="quick-log" aria-label="أهداف المباراة">
          {goals.map((e) => (
            <li key={e.id}>
              <span dir="ltr">{e.minute != null ? `${e.minute}'` : '—'}</span> {playerById(state, e.scorerId)?.name}
              <small> ({teamById(state, e.teamId)?.nickname})</small>
            </li>
          ))}
        </ol>
      )}

      {picking && (
        <div className="quick-sheet" role="dialog" aria-modal="true" aria-label="اختيار اللاعب">
          <div className="qs-box">
            <div className="qs-head">
              <b>{picking.scorer ? 'من صنع الهدف؟' : `من سجّل لـ ${teamOf(picking.side)?.nickname}؟`}</b>
              <button type="button" className="btn" onClick={() => setPicking(null)}>إلغاء</button>
            </div>
            <div className="field" style={{ maxWidth: 160 }}>
              <label htmlFor="q-min">الدقيقة (اختياري)</label>
              <input id="q-min" type="number" inputMode="numeric" min={1} max={120} value={minute} onChange={(e) => setMinute(e.target.value)} />
            </div>
            <div className="qs-grid">
              {(picking.scorer ? assistPlayers : scorerPlayers).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="qs-player"
                  disabled={busy}
                  onClick={() => (picking.scorer ? void saveGoal(picking.side, picking.scorer, p) : setPicking({ side: picking.side, scorer: p }))}
                >
                  <b>{p.number}</b>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            {picking.scorer && (
              <button type="button" className="btn btn-primary qs-skip" disabled={busy} onClick={() => void saveGoal(picking.side, picking.scorer)}>
                بدون صناعة — حفظ الهدف
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
