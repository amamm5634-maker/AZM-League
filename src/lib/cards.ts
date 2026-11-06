import type { CardInput, CardKind, MatchCard, Match, Player } from '../types';

export const CARD_LABELS: Record<CardKind, string> = { yellow: 'بطاقة صفراء', red: 'بطاقة حمراء' };
export const CARD_EMOJI: Record<CardKind, string> = { yellow: '🟨', red: '🟥' };

/**
 * يقرر ما يُسجَّل عند إعطاء بطاقة: أصفر ثاني لنفس اللاعب في المباراة = أصفر ثم أحمر تلقائي.
 * اللاعب المطرود (أحمر) لا يأخذ بطاقة أخرى في المباراة نفسها.
 */
export function planCard(
  existing: MatchCard[],
  input: CardInput,
  match: Match | undefined,
  players: Player[],
): { ok: true; kinds: CardKind[] } | { ok: false; error: string } {
  if (!match) return { ok: false, error: 'يرجى اختيار المباراة.' };
  if (input.teamId !== match.homeId && input.teamId !== match.awayId) return { ok: false, error: 'الفريق ليس طرفاً في هذه المباراة.' };
  const player = players.find((p) => p.id === input.playerId);
  if (!player || player.teamId !== input.teamId) return { ok: false, error: 'اللاعب ليس من هذا الفريق.' };
  if (input.kind !== 'yellow' && input.kind !== 'red') return { ok: false, error: 'نوع البطاقة غير صحيح.' };
  if (input.minute != null && (!Number.isInteger(input.minute) || input.minute < 1 || input.minute > 120)) {
    return { ok: false, error: 'الدقيقة بين 1 و120.' };
  }
  const mine = existing.filter((c) => c.matchId === match.id && c.playerId === input.playerId);
  if (mine.some((c) => c.kind === 'red')) return { ok: false, error: 'هذا اللاعب مطرود بالفعل في هذه المباراة.' };
  if (input.kind === 'yellow' && mine.some((c) => c.kind === 'yellow')) return { ok: true, kinds: ['yellow', 'red'] };
  return { ok: true, kinds: [input.kind] };
}

/** أحداث البطاقات لمباراة مرتبة بالدقيقة (بدون دقيقة في الآخر) */
export function cardsForMatch(cards: MatchCard[] | undefined, matchId: string): MatchCard[] {
  return (cards ?? []).filter((c) => c.matchId === matchId);
}
