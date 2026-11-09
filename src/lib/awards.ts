import type { TournamentState } from '../types';
import { lineupFor } from './lineup';

/** البطاقات الخاصة: تُحسب حيّة من النتائج المسجّلة، وتنتقل لمن يتصدّر */
export type AwardKind = 'scorer' | 'mvp' | 'keeper';

export const AWARD_LABELS: Record<AwardKind, string> = {
  scorer: 'هدّاف الدوري',
  mvp: 'أفضل لاعب',
  keeper: 'أفضل حارس',
};
export const AWARD_EMOJI: Record<AwardKind, string> = { scorer: '⚽', mvp: '⭐', keeper: '🧤' };
const ORDER: AwardKind[] = ['scorer', 'mvp', 'keeper'];

/** كل من يملك القيمة العليا (والتعادل يشارك الجميع). القيمة يجب أن تتجاوز min */
function leaders(values: Map<string, number>, min: number): string[] {
  let best = min;
  for (const v of values.values()) if (v > best) best = v;
  if (best <= min) return [];
  return [...values.entries()].filter(([, v]) => v === best).map(([id]) => id);
}

/** سجل الحراس: شباك نظيفة وأهداف دخلت مرماهم (حراس التشكيلة الأساسية في المباريات المنتهية) */
export function keeperRecords(state: TournamentState): Map<string, { cleanSheets: number; conceded: number }> {
  const out = new Map<string, { cleanSheets: number; conceded: number }>();
  for (const m of state.matches) {
    if (m.status !== 'completed') continue;
    for (const side of ['home', 'away'] as const) {
      const teamId = side === 'home' ? m.homeId : m.awayId;
      const lineup = lineupFor(state, m.id, teamId);
      const keeper = lineup?.playerIds.map((id) => state.players.find((p) => p.id === id)).find((p) => p && (lineup?.positions?.[p.id] ?? p.position) === 'حارس');
      if (!keeper) continue;
      const against = side === 'home' ? m.awayScore : m.homeScore;
      const r = out.get(keeper.id) ?? { cleanSheets: 0, conceded: 0 };
      r.conceded += against;
      if (against === 0) r.cleanSheets += 1;
      out.set(keeper.id, r);
    }
  }
  return out;
}

export function computeAwards(state: TournamentState): Record<string, AwardKind[]> {
  const out: Record<string, AwardKind[]> = {};
  const give = (ids: string[], kind: AwardKind) => {
    for (const id of ids) (out[id] ??= []).push(kind);
  };

  // الهداف: أكثر الأهداف (هدف واحد على الأقل)
  const goals = new Map<string, number>();
  for (const e of state.events) if (e.type === 'goal') goals.set(e.scorerId, (goals.get(e.scorerId) ?? 0) + 1);
  give(leaders(goals, 0), 'scorer');

  // أفضل لاعب: أكثر مرات «أفضل لاعب في المباراة»
  const motm = new Map<string, number>();
  for (const m of state.matches) if (m.motmId) motm.set(m.motmId, (motm.get(m.motmId) ?? 0) + 1);
  give(leaders(motm, 0), 'mvp');

  // أفضل حارس: أكثر شباك نظيفة، وعند التعادل أقل أهداف دخلت مرماه
  const rec = keeperRecords(state);
  const cs = new Map([...rec].map(([id, r]) => [id, r.cleanSheets]));
  const conceded = new Map([...rec].map(([id, r]) => [id, r.conceded]));
  const topCs = leaders(cs, 0);
  if (topCs.length > 0) {
    const least = Math.min(...topCs.map((id) => conceded.get(id) ?? 0));
    give(topCs.filter((id) => (conceded.get(id) ?? 0) === least), 'keeper');
  }

  for (const id of Object.keys(out)) out[id].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return out;
}
