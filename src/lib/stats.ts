import type {
  GroupId,
  Match,
  Player,
  PlayerStat,
  StandingRow,
  Team,
  TournamentState,
} from '../types';
import { GROUP_IDS } from '../data/config';

export function teamById(state: TournamentState, id: string): Team | undefined {
  return state.teams.find((t) => t.id === id);
}

export function playerById(state: TournamentState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

/** هل اكتملت القرعة (كل الفرق لها مجموعة)؟ */
export function isDrawn(state: TournamentState): boolean {
  return state.teams.length > 0 && state.teams.every((t) => !!t.group);
}

/**
 * ترتيب المجموعة حسب لائحة الدوري:
 * 1) النقاط  2) المواجهات المباشرة بين المتساويين  3) فارق الأهداف  4) النقاط التأديبية (الأقل أفضل).
 * وعند استمرار التعادل نستخدم الأهداف المسجلة ثم الاسم (ترتيب ثابت فقط، وليست من اللائحة).
 * المواجهات المباشرة: جدول مصغّر من المباريات المنتهية بين المتساويين فقط، وإن بقي تعادل بين بعضهم
 * تُطبَّق المواجهات المباشرة بينهم وحدهم من جديد.
 */
function rankWithTiebreakers(state: TournamentState, rows: StandingRow[]): StandingRow[] {
  const discipline = (id: string) => state.discipline?.[id] ?? 0;
  const name = (id: string) => teamById(state, id)?.name ?? '';
  const completed = state.matches.filter((m) => m.status === 'completed');

  const fallback = (block: StandingRow[]) =>
    [...block].sort(
      (x, y) =>
        y.gd - x.gd ||
        discipline(x.teamId) - discipline(y.teamId) ||
        y.gf - x.gf ||
        name(x.teamId).localeCompare(name(y.teamId), 'ar'),
    );

  const resolve = (block: StandingRow[]): StandingRow[] => {
    if (block.length <= 1) return block;
    const ids = new Set(block.map((r) => r.teamId));
    const mini = new Map<string, number>(block.map((r) => [r.teamId, 0]));
    for (const m of completed) {
      if (!ids.has(m.homeId) || !ids.has(m.awayId)) continue;
      if (m.homeScore > m.awayScore) mini.set(m.homeId, (mini.get(m.homeId) ?? 0) + 3);
      else if (m.homeScore < m.awayScore) mini.set(m.awayId, (mini.get(m.awayId) ?? 0) + 3);
      else {
        mini.set(m.homeId, (mini.get(m.homeId) ?? 0) + 1);
        mini.set(m.awayId, (mini.get(m.awayId) ?? 0) + 1);
      }
    }
    const values = [...new Set(mini.values())].sort((a, b) => b - a);
    if (values.length === 1) return fallback(block); // المواجهات المباشرة لم تفصل: ننتقل لفارق الأهداف
    return values.flatMap((v) => resolve(block.filter((r) => mini.get(r.teamId) === v)));
  };

  const byPts = [...rows].sort((a, b) => b.pts - a.pts);
  const out: StandingRow[] = [];
  for (let i = 0; i < byPts.length; ) {
    let j = i;
    while (j < byPts.length && byPts[j].pts === byPts[i].pts) j++;
    out.push(...resolve(byPts.slice(i, j)));
    i = j;
  }
  return out;
}

/** الترتيب حسب لائحة الدوري (انظر rankWithTiebreakers) */
export function computeStandings(state: TournamentState): Record<GroupId, StandingRow[]> {
  const rows = new Map<string, StandingRow>();
  for (const t of state.teams) {
    rows.set(t.id, { teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  }
  for (const m of state.matches) {
    if (m.status !== 'completed') continue;
    const h = rows.get(m.homeId);
    const a = rows.get(m.awayId);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += m.homeScore; h.ga += m.awayScore;
    a.gf += m.awayScore; a.ga += m.homeScore;
    if (m.homeScore > m.awayScore) { h.won++; a.lost++; h.pts += 3; }
    else if (m.homeScore < m.awayScore) { a.won++; h.lost++; a.pts += 3; }
    else { h.drawn++; a.drawn++; h.pts += 1; a.pts += 1; }
  }
  const result = {} as Record<GroupId, StandingRow[]>;
  for (const g of GROUP_IDS) {
    const list = state.teams
      .filter((t) => t.group === g)
      .map((t) => {
        const r = rows.get(t.id)!;
        r.gd = r.gf - r.ga;
        return r;
      });
    result[g] = rankWithTiebreakers(state, list);
    continue;
  }
  return result;
}

/** إحصاءات اللاعبين من الأحداث المسجلة فقط (نفس مصدر لوحة الإدارة) */
export function computePlayerStats(state: TournamentState): PlayerStat[] {
  const map = new Map<string, PlayerStat>();
  const get = (playerId: string, teamId: string) => {
    let s = map.get(playerId);
    if (!s) {
      s = { playerId, teamId, goals: 0, assists: 0 };
      map.set(playerId, s);
    }
    return s;
  };
  for (const e of state.events) {
    if (e.type !== 'goal') continue;
    get(e.scorerId, e.teamId).goals++;
    if (e.assistId) {
      const assister = playerById(state, e.assistId);
      get(e.assistId, assister?.teamId ?? e.teamId).assists++;
    }
  }
  return [...map.values()];
}

export function sortedScorers(stats: PlayerStat[]): PlayerStat[] {
  return stats
    .filter((s) => s.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.playerId.localeCompare(b.playerId));
}

export function sortedAssisters(stats: PlayerStat[]): PlayerStat[] {
  return stats
    .filter((s) => s.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.playerId.localeCompare(b.playerId));
}

const matchKey = (m: Match) => `${m.date}T${m.time}`;

export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => matchKey(a).localeCompare(matchKey(b)) || a.id.localeCompare(b.id));
}

/** أقرب مباراة لم تنتهِ (الجارية أولاً) */
export function nextMatch(state: TournamentState): Match | undefined {
  const live = state.matches.find((m) => m.status === 'live');
  if (live) return live;
  return sortMatches(state.matches).find((m) => m.status === 'scheduled');
}

export function latestResults(state: TournamentState, count: number): Match[] {
  return sortMatches(state.matches.filter((m) => m.status === 'completed')).reverse().slice(0, count);
}

export function eventsForMatch(state: TournamentState, matchId: string) {
  return state.events
    .filter((e) => e.matchId === matchId)
    .sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999));
}

/** آخر مباراة بدأت أو انتهت: تُستخدم لعرض "آخر تحديث" */
export function lastUpdateInfo(state: { matches: { status: string; date: string; time: string }[] }): { date: string; time: string } | null {
  const played = state.matches.filter((m) => m.status !== 'scheduled');
  if (played.length === 0) return null;
  const sorted = [...played].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const last = sorted[sorted.length - 1];
  return { date: last.date, time: last.time };
}

export function formatArabicDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** فريق الحاسوب (صاحب الموقع) أولاً في القوائم، والباقي بترتيبه الأصلي */
export function featuredFirst<T extends { nickname: string }>(teams: T[]): T[] {
  return [...teams].sort((a, b) => Number(b.nickname === 'حاسوب') - Number(a.nickname === 'حاسوب'));
}
