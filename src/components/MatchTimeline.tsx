import { useData } from '../store';
import { playerById } from '../lib/stats';
import { eventsForMatch } from '../lib/stats';
import { subsForMatch } from '../lib/subs';
import { CARD_EMOJI, CARD_LABELS, cardsForMatch } from '../lib/cards';
import type { Match } from '../types';

type Row = { key: string; minute?: number; teamId: string; kind: 'goal' | 'yellow' | 'red' | 'sub'; playerId: string; assistId?: string; inId?: string };

/** كل أحداث مباراة (أهداف وبطاقات وتبديلات) مرتبة بالدقيقة: صاحب الأرض يمين والضيف يسار والدقيقة في الوسط */
export function useMatchTimeline(matchId: string): Row[] {
  const state = useData();
  return [
    ...eventsForMatch(state, matchId).map((e): Row => ({ key: e.id, minute: e.minute, teamId: e.teamId, kind: 'goal', playerId: e.scorerId, assistId: e.assistId })),
    ...subsForMatch(state.subs, matchId).map((s): Row => ({ key: s.id, minute: s.minute, teamId: s.teamId, kind: 'sub', playerId: s.outId, inId: s.inId })),
    ...cardsForMatch(state.cards, matchId).map((c): Row => ({ key: c.id, minute: c.minute, teamId: c.teamId, kind: c.kind, playerId: c.playerId })),
  ]
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.minute ?? 999) - (b.r.minute ?? 999) || a.i - b.i)
    .map((x) => x.r);
}

export function MatchTimeline({ match, rows }: { match: Match; rows: Row[] }) {
  const state = useData();
  return (
    <ol className="goal-tl">
      {rows.map((e) => {
        const player = playerById(state, e.playerId);
        const assister = e.assistId ? playerById(state, e.assistId) : undefined;
        const isHome = e.teamId === match.homeId;
        const icon = e.kind === 'goal' ? '⚽' : e.kind === 'sub' ? '🔁' : CARD_EMOJI[e.kind];
        const label = e.kind === 'goal' ? 'هدف' : e.kind === 'sub' ? 'تبديل' : CARD_LABELS[e.kind];
        const content = (
          <div className={`ev ${isHome ? 'ev-home' : 'ev-away'} ev-${e.kind}`}>
            <span className="ev-ico" role="img" aria-label={label}>{icon}</span>
            <span className="ev-txt">
              {e.kind === 'sub' ? (
                <>
                  <a href={`#/player/${e.inId}`}><strong>{playerById(state, e.inId ?? '')?.name}</strong></a>
                  <small> بدل {player?.name}</small>
                </>
              ) : (
                <>
                  <a href={`#/player/${e.playerId}`}><strong>{player?.name}</strong></a>
                  {assister && <small> صناعة: {assister.name}</small>}
                </>
              )}
            </span>
          </div>
        );
        return (
          <li key={e.key}>
            <div className="ev-side">{isHome && content}</div>
            <span className="min" dir="ltr">{e.minute != null ? `${e.minute}'` : '•'}</span>
            <div className="ev-side">{!isHome && content}</div>
          </li>
        );
      })}
    </ol>
  );
}
