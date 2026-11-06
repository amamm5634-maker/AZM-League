import type { Lineup, Match, MatchCard, MatchSub, Player, SubInput } from '../types';

export const MAX_SUBS = 5;

/** اللاعبون الموجودون في الملعب الآن: التشكيلة الأساسية + من دخل − من خرج − المطرودون */
export function onPitchIds(lineup: Lineup | undefined, subs: MatchSub[], cards: MatchCard[], matchId: string, teamId: string): string[] {
  if (!lineup) return [];
  const mySubs = subs.filter((s) => s.matchId === matchId && s.teamId === teamId);
  const out = new Set(mySubs.map((s) => s.outId));
  const reds = new Set(cards.filter((c) => c.matchId === matchId && c.kind === 'red').map((c) => c.playerId));
  return [...lineup.playerIds, ...mySubs.map((s) => s.inId)].filter((id) => !out.has(id) && !reds.has(id));
}

/** البدلاء المتاحون: من لم يبدأ ولم يدخل ولم يخرج */
export function benchIds(lineup: Lineup | undefined, subs: MatchSub[], squad: Player[], matchId: string, teamId: string): string[] {
  if (!lineup) return [];
  const used = new Set<string>([...lineup.playerIds]);
  for (const s of subs) if (s.matchId === matchId && s.teamId === teamId) { used.add(s.inId); used.add(s.outId); }
  return squad.filter((p) => p.teamId === teamId && !used.has(p.id)).map((p) => p.id);
}

/** التحقق من تبديل جديد. يرجع نص الخطأ أو null */
export function validateSub(
  input: SubInput,
  match: Match | undefined,
  lineup: Lineup | undefined,
  subs: MatchSub[],
  cards: MatchCard[],
  squad: Player[],
): string | null {
  if (!match) return 'يرجى اختيار المباراة.';
  if (input.teamId !== match.homeId && input.teamId !== match.awayId) return 'الفريق ليس طرفاً في هذه المباراة.';
  if (!lineup) return 'سجّل التشكيلة الأساسية للفريق أولاً قبل التبديل.';
  if (input.minute != null && (!Number.isInteger(input.minute) || input.minute < 1 || input.minute > 120)) return 'الدقيقة بين 1 و120.';
  const mine = subs.filter((s) => s.matchId === input.matchId && s.teamId === input.teamId);
  if (mine.length >= MAX_SUBS) return `استُنفدت التبديلات (الحد الأقصى ${MAX_SUBS}).`;
  const team = squad.filter((p) => p.teamId === input.teamId);
  if (!team.some((p) => p.id === input.outId) || !team.some((p) => p.id === input.inId)) return 'اللاعبان يجب أن يكونا من الفريق نفسه.';
  if (input.outId === input.inId) return 'اختر لاعبين مختلفين.';
  if (!onPitchIds(lineup, subs, cards, input.matchId, input.teamId).includes(input.outId)) return 'اللاعب الخارج ليس في الملعب الآن.';
  if (!benchIds(lineup, subs, squad, input.matchId, input.teamId).includes(input.inId)) return 'اللاعب الداخل ليس من البدلاء المتاحين (من خرج أو لعب لا يعود).';
  return null;
}

/** حذف تبديل مسموح فقط إن لم يُبنَ عليه تبديل لاحق (خرج من دخل به) */
export function canDeleteSub(subs: MatchSub[], sub: MatchSub): boolean {
  return !subs.some((s) => s.id !== sub.id && s.matchId === sub.matchId && s.teamId === sub.teamId && s.outId === sub.inId);
}

export function subsForMatch(subs: MatchSub[] | undefined, matchId: string): MatchSub[] {
  return (subs ?? []).filter((s) => s.matchId === matchId);
}
