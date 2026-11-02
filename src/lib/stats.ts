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

/** الترتيب: النقاط ثم فارق الأهداف ثم الأهداف المسجلة ثم الاسم */
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
    list.sort((x, y) => {
      if (y.pts !== x.pts) return y.pts - x.pts;
      if (y.gd !== x.gd) return y.gd - x.gd;
      if (y.gf !== x.gf) return y.gf - x.gf;
      const nx = teamById(state, x.teamId)?.name ?? '';
      const ny = teamById(state, y.teamId)?.name ?? '';
      return nx.localeCompare(ny, 'ar');
    });
    result[g] = list;
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
