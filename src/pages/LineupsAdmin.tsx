import { useEffect, useMemo, useState } from 'react';
import type { Match, Player, Position, Team } from '../types';
import { formatArabicDate, sortMatches, teamById } from '../lib/stats';
import { matchLabel } from '../lib/gallery';
import { LINEUP_SIZE, buildFormation, kickoffTime, lineupFor, lineupLock, validateLineup } from '../lib/lineup';
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
  const problem = ids.length === LINEUP_SIZE ? validateLineup(squad, ids) : null;
  const canSave = !lock.locked && !busy && ids.length === LINEUP_SIZE && !problem;
  const formation = ids.length > 0 ? buildFormation(squad, ids).label : null;
  const unchanged = !!saved && saved.playerIds.length === ids.length && saved.playerIds.every((id) => ids.includes(id));
  // آخر تشكيلة سجّلها هذا الفريق في مباراة أخرى (الأحدث بحسب موعد المباراة)، لتكون نقطة بداية سريعة
  const previous = useMemo(() => {
    let best: { ids: string[]; t: number } | undefined;
    for (const l of state.lineups ?? []) {
      if (l.teamId !== team.id || l.matchId === match.id) continue;
      const m = state.matches.find((x) => x.id === l.matchId);
      const t = m ? kickoffTime(m) : 0;
      if (!best || t > best.t) best = { ids: l.playerIds, t };
    }
    return best?.ids;
  }, [state.lineups, state.matches, team.id, match.id]);

  const toggle = (id: string) => {
    if (lock.locked) return;
    setNotice(null);
    setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= LINEUP_SIZE ? cur : [...cur, id]));
  };

  const save = async () => {
    setBusy(true);
    setNotice(null);
    const res = await actions.saveLineup(match.id, team.id, ids);
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
                    return (
                      <button
                        key={p.id}
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
                onClick={() => { setIds(previous.filter((id) => squad.some((p) => p.id === id))); setNotice(null); }}
              >
                نسخ آخر تشكيلة
              </button>
            )}
            {ids.length > 0 && !lock.locked && (
              <button type="button" className="btn" disabled={busy} onClick={() => { setIds([]); setNotice(null); }}>مسح الاختيار</button>
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
