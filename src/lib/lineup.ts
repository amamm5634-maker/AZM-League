import type { Lineup, Match, Player, Position, TournamentState } from '../types';

// ============ التشكيلة التي يسجّلها مسجّل المباراة ============
export const LINEUP_SIZE = 11;
const POSITION_ORDER: Position[] = ['حارس', 'مدافع', 'وسط', 'جناح', 'مهاجم'];
/** كم دقيقة قبل البداية تُقفل التشكيلة؟ (0 = عند البداية) */
export const LINEUP_LOCK_MINUTES_BEFORE = 0;

/** يتحقق من اختيار 11 لاعباً: العدد، عدم التكرار، الانتماء للفريق، وجود حارس. يرجع رسالة عربية أو null إن كان سليماً */
/** مركز اللاعب في هذه التشكيلة: المختار لهذه المباراة إن وُجد، وإلا مركزه المعتاد */
export function effectivePosition(p: Player, positions?: Record<string, Position>): Position {
  const o = positions?.[p.id];
  return o && POSITION_ORDER.includes(o) ? o : p.position;
}

/** يُبقي فقط المراكز المختلفة عن المعتاد ولاعبي التشكيلة (حتى لا نخزّن ما لا لزوم له) */
export function normalizePositions(squad: Player[], playerIds: string[], positions?: Record<string, Position>): Record<string, Position> {
  const out: Record<string, Position> = {};
  if (!positions) return out;
  const byId = new Map(squad.map((p) => [p.id, p]));
  for (const id of playerIds) {
    const p = byId.get(id);
    const o = positions[id];
    if (p && o && POSITION_ORDER.includes(o) && o !== p.position) out[id] = o;
  }
  return out;
}

export function validateLineup(squad: Player[], playerIds: string[], positions?: Record<string, Position>): string | null {
  if (playerIds.length !== LINEUP_SIZE) return `اختر ${LINEUP_SIZE} لاعباً بالضبط (المختار ${playerIds.length}).`;
  if (new Set(playerIds).size !== playerIds.length) return 'يوجد لاعب مكرر في التشكيلة.';
  const byId = new Map(squad.map((p) => [p.id, p]));
  const picked = playerIds.map((id) => byId.get(id));
  if (picked.some((p) => !p)) return 'يوجد لاعب ليس من قائمة هذا الفريق.';
  if (!picked.some((p) => effectivePosition(p!, positions) === 'حارس')) return 'يجب أن يكون في التشكيلة حارس مرمى.';
  return null;
}

/** طرق اللعب المتاحة للاختيار (دفاع-وسط-هجوم). "تلقائي" = تُحسب من مراكز اللاعبين. */
export const FORMATIONS = ['4-4-2', '4-3-3', '4-2-3-1', '4-5-1', '4-1-4-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1'] as const;
export function isFormation(v: unknown): v is string {
  return typeof v === 'string' && (FORMATIONS as readonly string[]).includes(v);
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

/** داخل الخط الواحد: الأجنحة على الطرفين والباقون في الوسط */
function arrange(row: Player[]): Player[] {
  const wings = row.filter((p) => p.position === 'جناح');
  const rest = row.filter((p) => p.position !== 'جناح');
  const half = Math.ceil(wings.length / 2);
  return [...wings.slice(0, half), ...rest, ...wings.slice(half)];
}

/** يرتّب المختارين على الملعب حسب مراكزهم. الباقون من القائمة هم البدلاء */
export function buildFormation(squad: Player[], playerIds: string[], positions?: Record<string, Position>, formation?: string): Formation {
  const ids = new Set(playerIds);
  // المراكز المختارة لهذه المباراة تحلّ محل المراكز المعتادة في الترتيب والعرض
  const starters = squad
    .filter((p) => ids.has(p.id))
    .map((p) => ({ ...p, position: effectivePosition(p, positions) }))
    .sort((a, b) => a.number - b.number);
  const by = (pos: Position) => starters.filter((p) => p.position === pos);
  const wings = by('جناح');
  const strikers = by('مهاجم');
  const half = Math.ceil(wings.length / 2);
  // الهجوم: جناح في كل طرف والمهاجمون في الوسط
  const attack = [...wings.slice(0, half), ...strikers, ...wings.slice(half)];
  const gk = by('حارس');
  const def = by('مدافع');
  const mid = by('وسط');
  let rows = [attack, mid, def, gk].filter((r) => r.length > 0);
  let label = [def.length, mid.length, attack.length].join('-');
  // طريقة لعب مختارة: نوزّع لاعبي الميدان (دفاع ثم وسط ثم هجوم بترتيب مراكزهم) على خطوطها
  if (isFormation(formation) && gk.length === 1) {
    const parts = formation.split('-').map(Number);
    const field = starters
      .filter((p) => p.position !== 'حارس')
      .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || a.number - b.number);
    if (parts.reduce((a, b) => a + b, 0) === field.length) {
      const lines: Player[][] = [];
      let at = 0;
      for (const n of parts) { lines.push(arrange(field.slice(at, at + n))); at += n; }
      rows = [...lines.reverse(), gk];
      label = formation;
    }
  }
  const subs = squad.filter((p) => !ids.has(p.id)).sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || a.number - b.number);
  return { rows, label, subs };
}
