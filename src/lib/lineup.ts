import type { Lineup, Match, Player, Position, TournamentState } from '../types';

// ============ التشكيلة التي يسجّلها مسجّل المباراة ============
export const LINEUP_SIZE = 11;
const POSITION_ORDER: Position[] = ['حارس', 'مدافع', 'وسط', 'جناح', 'مهاجم'];
/** كم دقيقة قبل البداية تُقفل التشكيلة؟ (0 = عند البداية) */
export const LINEUP_LOCK_MINUTES_BEFORE = 0;

/** يتحقق من اختيار 11 لاعباً: العدد، عدم التكرار، الانتماء للفريق، وجود حارس. يرجع رسالة عربية أو null إن كان سليماً */
export function validateLineup(squad: Player[], playerIds: string[]): string | null {
  if (playerIds.length !== LINEUP_SIZE) return `اختر ${LINEUP_SIZE} لاعباً بالضبط (المختار ${playerIds.length}).`;
  if (new Set(playerIds).size !== playerIds.length) return 'يوجد لاعب مكرر في التشكيلة.';
  const byId = new Map(squad.map((p) => [p.id, p]));
  const picked = playerIds.map((id) => byId.get(id));
  if (picked.some((p) => !p)) return 'يوجد لاعب ليس من قائمة هذا الفريق.';
  if (!picked.some((p) => p!.position === 'حارس')) return 'يجب أن يكون في التشكيلة حارس مرمى.';
  return null;
}

/** وقت بداية المباراة (التوقيت المحلي للسودان UTC+2 بلا توقيت صيفي) */
export function kickoffTime(match: Match): number {
  return new Date(`${match.date}T${match.time}:00+02:00`).getTime();
}

export interface LineupLock { locked: boolean; reason?: string }

/** هل التشكيلة مقفولة؟ تُقفل عند بداية المباراة (بالوقت أو بتغيّر الحالة). الأدمن يعدّل دائماً. */
export function lineupLock(match: Match, now: number, isAdmin: boolean): LineupLock {
  if (isAdmin) return { locked: false };
  if (match.status !== 'scheduled') return { locked: true, reason: 'بدأت المباراة، والتشكيلة مقفولة. التعديل للأدمن فقط.' };
  const t = kickoffTime(match);
  if (Number.isFinite(t) && now >= t - LINEUP_LOCK_MINUTES_BEFORE * 60_000) {
    return { locked: true, reason: 'حان موعد المباراة، والتشكيلة مقفولة. التعديل للأدمن فقط.' };
  }
  return { locked: false };
}

export function lineupFor(state: TournamentState, matchId: string, teamId: string): Lineup | undefined {
  return state.lineups?.find((l) => l.matchId === matchId && l.teamId === teamId);
}

/** أحدث تشكيلة مسجّلة للفريق في أي مباراة (بحسب موعد المباراة) مع المباراة نفسها */
export function latestLineup(state: TournamentState, teamId: string): { lineup: Lineup; match: Match } | undefined {
  let best: { lineup: Lineup; match: Match } | undefined;
  for (const l of state.lineups ?? []) {
    if (l.teamId !== teamId) continue;
    const match = state.matches.find((m) => m.id === l.matchId);
    if (!match) continue;
    if (!best || kickoffTime(match) > kickoffTime(best.match)) best = { lineup: l, match };
  }
  return best;
}

export interface Formation {
  /** الصفوف من الهجوم إلى الحارس */
  rows: Player[][];
  /** مثل 4-3-3 (عدد المدافعين-الوسط-الهجوم) */
  label: string;
  subs: Player[];
}

/** يرتّب المختارين على الملعب حسب مراكزهم. الباقون من القائمة هم البدلاء */
export function buildFormation(squad: Player[], playerIds: string[]): Formation {
  const ids = new Set(playerIds);
  const starters = squad.filter((p) => ids.has(p.id)).sort((a, b) => a.number - b.number);
  const by = (pos: Position) => starters.filter((p) => p.position === pos);
  const wings = by('جناح');
  const strikers = by('مهاجم');
  const half = Math.ceil(wings.length / 2);
  // الهجوم: جناح في كل طرف والمهاجمون في الوسط
  const attack = [...wings.slice(0, half), ...strikers, ...wings.slice(half)];
  const gk = by('حارس');
  const def = by('مدافع');
  const mid = by('وسط');
  const rows = [attack, mid, def, gk].filter((r) => r.length > 0);
  const label = [def.length, mid.length, attack.length].join('-');
  const subs = squad.filter((p) => !ids.has(p.id)).sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || a.number - b.number);
  return { rows, label, subs };
}
