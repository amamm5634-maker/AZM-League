import type { Match } from '../types';

/** يزيد أو ينقص نتيجة الفريق في المباراة (لا تنزل عن صفر) */
export function adjustScore(match: Match, teamId: string, delta: number): void {
  if (teamId === match.homeId) match.homeScore = Math.max(0, match.homeScore + delta);
  else if (teamId === match.awayId) match.awayScore = Math.max(0, match.awayScore + delta);
}
