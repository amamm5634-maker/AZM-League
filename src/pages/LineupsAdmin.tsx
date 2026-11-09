import { useEffect, useMemo, useState } from 'react';
import type { Match, Player, Position, Team } from '../types';
import { formatArabicDate, sortMatches, teamById } from '../lib/stats';
import { matchLabel } from '../lib/gallery';
import { LINEUP_SIZE, buildFormation, kickoffTime, lineupFor, lineupLock, normalizePositions, validateLineup } from '../lib/lineup';
import { useData, useTournament } from '../store';
import { EmptyState } from '../components/StateViews';
import { TeamBadge } from '../components/TeamBadge';

const POSITIONS: Position[] = ['حارس', 'مدافع', 'وسط', 'جناح', 'مهاجم'];

/** تبويب التشكيلات: المسجّل يختار 11 لاعباً من قائمة كل فريق. الباقون بدلاء تلقائياً. */
export function LineupsAdmin({ isAdmin }: { isAdmin: boolean }) {
  const state = useData();
  const matches = useMemo(
    () => sortMatches(state.matches).filter((m) => isAdmin || m.status !== 'completed'),
    [state.matches, isAdmin],
  );
  const [matchId, setMatchId] = useState('');

  useEffect(() => {
    if (matchId && matches.some((m) => m.id === matchId)) return;
    const next = matches.find((m) => m.status !== 'completed') ?? matches[0];
    setMatchId(next?.id ?? '');
  }, [matches, matchId]);

  if (matches.length === 0) {
    return (
      <section className="card admin-panel" style={{ marginTop: 16 }}>
        <EmptyState title="لا توجد مباريات لتسجيل تشكيلاتها" hint="تظهر المباريات هنا بعد إدخال القرعة." />
      </section>
    );
  }
  const match = matches.find((m) => m.id === matchId) ?? matches[0];

  return (
    <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
      <section className="card admin-panel" aria-labelledby="lu-title">
        <h2 id="lu-title">التشكيلات الأساسية</h2>
        <p className="field-hint">اختر المباراة، ثم علّم 11 لاعباً لكل فريق من قائمته. باقي اللاعبين يُحسبون بدلاء تلقائياً.</p>
        <div className="field">
          <label htmlFor="lu-match">المباراة</label>
          <select id="lu-match" value={match.id} onChange={(e) => setMatchId(e.target.value)}>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {matchLabel(state, m)} — {formatArabicDate(m.date)} {m.time}
              </option>
            ))}
          </select>
        </div>
      </section>
      {[match.homeId, match.awayId].map((tid) => {
        const team = teamById(state, tid);
        return team ? <TeamLineupEditor key={`${match.id}-${tid}`} match={match} team={team} isAdmin={isAdmin} /> : null;
      })}
    </div>
  );
}

function TeamLineupEditor({ match, team, isAdmin }: { match: Match; team: Team; isAdmin: boolean }) {
  const state = useData();
  const { actions } = useTournament();
  const squad = useMemo(
    () => state.players.filter((p) => p.teamId === team.id).sort((a, b) => a.number - b.number),
    [state.players, team.id],
  );
  const saved = lineupFor(state, match.id, team.id);
  const [ids, setIds] = useState<string[]>(saved?.playerIds ?? []);
  // مراكز تخالف المعتاد في هذه المباراة فقط (مثل جناح يلعب وسطاً الليلة)
  const [ovr, setOvr] = useState<Record<string, Position>>(saved?.positions ?? {});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // القفل يُعاد حسابه كل نصف دقيقة ليظهر عند حلول موعد المباراة دون تحديث الصفحة
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const lock = lineupLock(match, now, isAdmin);
  const adminOverride = isAdmin && (match.status !== 'scheduled');
  const cleaned = useMemo(() => normalizePositions(squad, ids, ovr), [squad, ids, ovr]);
  const problem = ids.length === LINEUP_SIZE ? validateLineup(squad, ids, cleaned) : null;
  const canSave = !lock.locked && !busy && ids.length === LINEUP_SIZE && !problem;
  const formation = ids.length > 0 ? buildFormation(squad, ids, cleaned).label : null;
  const samePositions = JSON.stringify(Object.entries(saved?.positions ?? {}).sort()) === JSON.stringify(Object.entries(cleaned).sort());
  const unchanged = !!saved && saved.playerIds.length === ids.length && saved.playerIds.every((id) => ids.includes(id)) && samePositions;
  // آخر تشكيلة سجّلها هذا الفريق في مباراة أخرى (الأحدث بحسب موعد المباراة)، لتكون نقطة بداية سريعة
  const previous = useMemo(() => {
    let best: { ids: string[]; positions?: Record<string, Position>; t: number } | undefined;
    for (const l of state.lineups ?? []) {
      if (l.teamId !== team.id || l.matchId === match.id) continue;
      const m = state.matches.find((x) => x.id === l.matchId);
      const t = m ? kickoffTime(m) : 0;
      if (!best || t > best.t) best = { ids: l.playerIds, positions: l.positions, t };
    }
    return best;
  }, [state.lineups, state.matches, team.id, match.id]);

  const toggle = (id: string) => {
    if (lock.locked) return;
    setNotice(null);
    // عند إلغاء اختيار لاعب نمسح المركز المخصص له
    setOvr((cur) => {
      if (!(id in cur)) return cur;
      const next = { ...cur };
      if (ids.includes(id)) delete next[id];
      return next;
    });
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= LINEUP_SIZE ? cur : [...cur, id]));
  };

  const setPlayerPos = (p: Player, value: Position) => {
    if (lock.locked) return;
    setNotice(null);
    setOvr((cur) => {
      const next = { ...cur };
      if (value === p.position) delete next[p.id];
      else next[p.id] = value;
      return next;
    });
  };

  const save = async () => {
    setBusy(true);
    setNotice(null);
    const res = await actions.saveLineup(match.id, team.id, ids, cleaned);
    setBusy(false);
    setNotice(res.ok ? { type: 'ok', text: res.message } : { type: 'error', text: res.error });
  };

  const byPos = (pos: Position): Player[] => squad.filter((p) => p.position === pos);

  return (
    <section className="card admin-panel lineup-editor" aria-labelledby={`le-${team.id}`}>
      <div className="le-head">
        <TeamBadge team={team} size={36} />
        <h2 id={`le-${team.id}`} style={{ margin: 0 }}>{team.name}</h2>
        <span className={`chip${ids.length === LINEUP_SIZE ? ' chip-ok' : ''}`} aria-live="polite">{ids.length}/{LINEUP_SIZE}</span>
        {formation && ids.length === LINEUP_SIZE && <span className="chip chip-soft" dir="ltr">{formation}</span>}
      </div>

      {squad.length === 0 ? (
        <p className="field-hint">لا توجد قائمة لاعبين لهذا الفريق بعد. تُضاف القائمة من ملف rosters.ts.</p>
      ) : (
        <>
          {lock.locked && <p role="note" className="lineup-lock">🔒 {lock.reason}</p>}
          {adminOverride && <p role="note" className="field-hint">المباراة بدأت، لكنك أدمن فتقدر تعدّل التشكيلة.</p>}
          {saved && !lock.locked && <p className="field-hint">محفوظة حالياً: يمكنك تعديلها وحفظها من جديد.</p>}

          {POSITIONS.map((pos) => {
            const list = byPos(pos);
            if (list.length === 0) return null;
            return (
              <fieldset key={pos} className="le-group">
                <legend>{pos}</legend>
                <div className="le-grid">
                  {list.map((p) => {
                    const on = ids.includes(p.id);
                    const custom = on && cleaned[p.id];
                    return (
                      <div key={p.id} className={`le-cell${custom ? ' custom' : ''}`}>
                        <button
                          type="button"
                          className={`le-player${on ? ' on' : ''}`}
                          aria-pressed={on}
                          disabled={lock.locked || (!on && ids.length >= LINEUP_SIZE)}
                          onClick={() => toggle(p.id)}
                        >
                          <span className="num-badge">{p.number}</span>
                          <span className="le-name">{p.name}</span>
                          <span className="le-tick" aria-hidden="true">{on ? '✓' : ''}</span>
                        </button>
                        {on && (
                          <label className="le-pos">
                            <span>يلعب الليلة كـ</span>
                            <select value={ovr[p.id] ?? p.position} disabled={lock.locked} onChange={(e) => setPlayerPos(p, e.target.value as Position)}>
                              {POSITIONS.map((x) => <option key={x} value={x}>{x}{x === p.position ? ' (المعتاد)' : ''}</option>)}
                            </select>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {problem && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 600 }}>{problem}</p>}
          {ids.length === LINEUP_SIZE && !problem && !lock.locked && <p className="field-hint">اكتملت التشكيلة. لتبديل لاعب ألغِ اختيار لاعب أولاً ثم اختر البديل.</p>}
          {!problem && ids.length < LINEUP_SIZE && !lock.locked && <p className="field-hint">باقي {LINEUP_SIZE - ids.length} لاعب لتكتمل التشكيلة.</p>}

          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={!canSave || unchanged}>
              {busy ? 'جارٍ الحفظ…' : unchanged ? 'محفوظة ✓' : 'حفظ التشكيلة'}
            </button>
            {previous && !lock.locked && (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => {
                  const keep = previous.ids.filter((id) => squad.some((p) => p.id === id));
                  setIds(keep);
                  setOvr(normalizePositions(squad, keep, previous.positions));
                  setNotice(null);
                }}
              >
                نسخ آخر تشكيلة
              </button>
            )}
            {ids.length > 0 && !lock.locked && (
              <button type="button" className="btn" disabled={busy} onClick={() => { setIds([]); setOvr({}); setNotice(null); }}>مسح الاختيار</button>
            )}
          </div>
          {notice && (
            <p role={notice.type === 'error' ? 'alert' : 'status'} style={{ marginTop: 8, fontWeight: 600, color: notice.type === 'error' ? 'var(--danger)' : 'var(--lime)' }}>
              {notice.text}
            </p>
          )}
        </>
      )}
    </section>
  );
}
