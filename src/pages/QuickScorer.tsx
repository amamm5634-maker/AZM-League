import { useEffect, useMemo, useRef, useState } from 'react';
import type { Match, Player } from '../types';
import { GROUP_LABELS, MATCH_STATUS_LABELS } from '../data/config';
import { eventsForMatch, formatArabicDate, playerById, sortMatches, teamById } from '../lib/stats';
import { useData, useTournament } from '../store';
import { TeamBadge } from '../components/TeamBadge';
import { CARD_EMOJI, CARD_LABELS, cardsForMatch } from '../lib/cards';
import type { CardKind } from '../types';
import { benchIds, canDeleteSub, MAX_SUBS, onPitchIds, subsForMatch } from '../lib/subs';
import { lineupFor } from '../lib/lineup';

type Side = 'home' | 'away';
type Notice = { type: 'ok' | 'error'; text: string };
type EventKind = 'goal' | 'yellow' | 'red' | 'sub';
const KINDS: { id: EventKind; emoji: string; label: string }[] = [
  { id: 'goal', emoji: '⚽', label: 'هدف' },
  { id: 'yellow', emoji: '🟨', label: 'إنذار' },
  { id: 'red', emoji: '🟥', label: 'طرد' },
  { id: 'sub', emoji: '🔁', label: 'تبديل' },
];

/** وضع الميدان: شاشة بأزرار كبيرة لتسجيل مباراة واحدة بسرعة من الموبايل */
export function QuickScorer() {
  const state = useData();
  const { actions } = useTournament();
  const open = useMemo(() => sortMatches(state.matches).filter((m) => m.status !== 'completed'), [state.matches]);
  const [matchId, setMatchId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [picking, setPicking] = useState<{ side: Side; scorer?: Player; card?: CardKind; sub?: boolean; out?: Player } | null>(null);
  const [minute, setMinute] = useState('');
  const [lastSide, setLastSide] = useState<Side | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [kind, setKind] = useState<EventKind>('goal');

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

  async function saveCard(side: Side, kind: CardKind, player: Player) {
    const team = teamOf(side);
    if (!team) return;
    const min = minute.trim() === '' ? undefined : Number(minute);
    const ok = await run(actions.addCard({ matchId: m.id, teamId: team.id, playerId: player.id, kind, minute: min }));
    if (ok) {
      setPicking(null);
      setMinute('');
    }
  }

  const lineupOf = (side: Side) => lineupFor(state, m.id, teamOf(side)?.id ?? '');
  const matchSubs = subsForMatch(state.subs, m.id);
  const subsLeft = (side: Side) => MAX_SUBS - matchSubs.filter((s) => s.teamId === teamOf(side)?.id).length;
  const pitchPlayers = (side: Side) => {
    const ids = new Set(onPitchIds(lineupOf(side), state.subs ?? [], state.cards ?? [], m.id, teamOf(side)?.id ?? ''));
    return squad(side).filter((p) => ids.has(p.id));
  };
  const benchPlayers = (side: Side) => {
    const ids = new Set(benchIds(lineupOf(side), state.subs ?? [], state.players, m.id, teamOf(side)?.id ?? ''));
    return squad(side).filter((p) => ids.has(p.id));
  };

  async function saveSub(side: Side, out: Player, inn: Player) {
    const team = teamOf(side);
    if (!team) return;
    const min = minute.trim() === '' ? undefined : Number(minute);
    const ok = await run(actions.addSub({ matchId: m.id, teamId: team.id, outId: out.id, inId: inn.id, minute: min }));
    if (ok) {
      setPicking(null);
      setMinute('');
    }
  }

  function onTeam(side: Side) {
    if (kind === 'goal') onGoal(side);
    else if (kind === 'sub') setPicking({ side, sub: true });
    else setPicking({ side, card: kind });
  }
  const teamDisabled = (side: Side) =>
    busy || (kind === 'sub' ? !lineupOf(side) || subsLeft(side) <= 0 : kind !== 'goal' && squad(side).length === 0);
  const teamHint = (side: Side) =>
    kind === 'sub' ? (!lineupOf(side) ? 'سجّل التشكيلة أولاً' : subsLeft(side) <= 0 ? 'استُنفدت التبديلات' : `متبقٍ ${subsLeft(side)} تبديلات`) : kind === 'goal' ? 'تسجيل هدف' : kind === 'yellow' ? 'بطاقة صفراء' : 'بطاقة حمراء';

  // سجل المباراة: كل الأحداث في قائمة واحدة مرتبة بالدقيقة
  const matchCards = cardsForMatch(state.cards, m.id);
  const log = [
    ...goals.map((e) => ({ key: `g${e.id}`, minute: e.minute, icon: '⚽', teamId: e.teamId, text: `${playerById(state, e.scorerId)?.name ?? ''}${e.assistId ? ` (صناعة: ${playerById(state, e.assistId)?.name})` : ''}`, canDelete: true, del: () => actions.deleteEvent(e.id) })),
    ...matchCards.map((c) => ({ key: `c${c.id}`, minute: c.minute, icon: CARD_EMOJI[c.kind], teamId: c.teamId, text: playerById(state, c.playerId)?.name ?? '', canDelete: true, del: () => actions.deleteCard(c.id) })),
    ...matchSubs.map((x) => ({ key: `s${x.id}`, minute: x.minute, icon: '🔁', teamId: x.teamId, text: `دخل ${playerById(state, x.inId)?.name} بدل ${playerById(state, x.outId)?.name}`, canDelete: canDeleteSub(matchSubs, x), del: () => actions.deleteSub(x.id) })),
  ]
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.minute ?? 999) - (b.r.minute ?? 999) || a.i - b.i)
    .map((x) => x.r);

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
      <div className="field qx-pick">
        <label htmlFor="q-match">المباراة</label>
        <select id="q-match" value={matchId} onChange={(e) => { setMatchId(e.target.value); setPicking(null); }}>
          {open.map((x) => (
            <option key={x.id} value={x.id}>
              {teamById(state, x.homeId)?.nickname} × {teamById(state, x.awayId)?.nickname} — {formatArabicDate(x.date)} {x.time}
            </option>
          ))}
        </select>
      </div>

      <div className="qx-main">
        <section className="qx-board" aria-label="النتيجة">
          <div className="qx-meta">
            <span className={`chip st-${match.status}`}>{MATCH_STATUS_LABELS[match.status]}</span>
            <span className="chip chip-soft">{GROUP_LABELS[match.group]}</span>
          </div>
          <div className="qx-score">
            <div className="qx-side"><TeamBadge team={home} size={58} /><b>{home?.nickname}</b></div>
            <div className="qx-nums" dir="ltr" aria-label={`النتيجة ${match.homeScore} - ${match.awayScore}`}>
              <span>{match.awayScore}</span><i>-</i><span>{match.homeScore}</span>
            </div>
            <div className="qx-side"><TeamBadge team={away} size={58} /><b>{away?.nickname}</b></div>
          </div>
        </section>

        <section className="qx-panel" aria-label="تسجيل حدث">
          <div className="qx-kinds" role="radiogroup" aria-label="نوع الحدث">
            {KINDS.map((k) => (
              <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={`qx-kind k-${k.id}${kind === k.id ? ' on' : ''}`} onClick={() => setKind(k.id)}>
                <span className="ke" aria-hidden="true">{k.emoji}</span>
                <span>{k.label}</span>
              </button>
            ))}
          </div>
          <p className="qx-step">اختر الفريق ثم اللاعب</p>
          <div className="qx-teams">
            {(['home', 'away'] as Side[]).map((side) => {
              const t = teamOf(side);
              return (
                <button key={side} type="button" className={`qx-team k-${kind}`} disabled={teamDisabled(side)} onClick={() => onTeam(side)}>
                  <TeamBadge team={t} size={46} />
                  <b>{t?.nickname}</b>
                  <small>{teamHint(side)}</small>
                </button>
              );
            })}
          </div>
        </section>

        {notice && <div className={`toast ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}><span>{notice.text}</span></div>}

        <div className="qx-controls">
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
          <button type="button" className="btn" disabled={busy || (goals.length === 0 && match.homeScore + match.awayScore === 0)} onClick={() => void undo()}>
            ↩ تراجع عن آخر هدف
          </button>
        </div>
      </div>

      <aside className="qx-log" aria-label="سجل المباراة">
        <h3>سجل المباراة</h3>
        {log.length === 0 ? (
          <p className="qx-empty">لا أحداث بعد. اختر نوع الحدث ثم الفريق.</p>
        ) : (
          <ol>
            {log.map((r) => (
              <li key={r.key}>
                <span className="qx-min" dir="ltr">{r.minute != null ? `${r.minute}'` : '—'}</span>
                <span className="qx-ic" aria-hidden="true">{r.icon}</span>
                <span className="qx-tx">{r.text}<small> ({teamById(state, r.teamId)?.nickname})</small></span>
                <button type="button" className="btn" disabled={busy || !r.canDelete} onClick={() => void run(r.del())} aria-label="حذف الحدث">حذف</button>
              </li>
            ))}
          </ol>
        )}
      </aside>

      {picking && (
        <div className="quick-sheet" role="dialog" aria-modal="true" aria-label="اختيار اللاعب">
          <div className="qs-box">
            <div className="qs-head">
              <b>{picking.sub ? (picking.out ? `🔁 من يدخل بدل ${picking.out.name}؟` : `🔁 من يخرج من ${teamOf(picking.side)?.nickname}؟`) : picking.card ? `${CARD_EMOJI[picking.card]} من أخذ ${CARD_LABELS[picking.card]} في ${teamOf(picking.side)?.nickname}؟` : picking.scorer ? 'من صنع الهدف؟' : `من سجّل لـ ${teamOf(picking.side)?.nickname}؟`}</b>
              <button type="button" className="btn" onClick={() => setPicking(null)}>إلغاء</button>
            </div>
            <div className="field" style={{ maxWidth: 160 }}>
              <label htmlFor="q-min">الدقيقة (اختياري)</label>
              <input id="q-min" type="number" inputMode="numeric" min={1} max={120} value={minute} onChange={(e) => setMinute(e.target.value)} />
            </div>
            <div className="qs-grid">
              {(picking.sub ? (picking.out ? benchPlayers(picking.side) : pitchPlayers(picking.side)) : picking.scorer ? assistPlayers : scorerPlayers).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="qs-player"
                  disabled={busy}
                  onClick={() => (picking.sub ? (picking.out ? void saveSub(picking.side, picking.out, p) : setPicking({ side: picking.side, sub: true, out: p })) : picking.card ? void saveCard(picking.side, picking.card, p) : picking.scorer ? void saveGoal(picking.side, picking.scorer, p) : setPicking({ side: picking.side, scorer: p }))}
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
