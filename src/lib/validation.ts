import type { EventInput, TournamentState } from '../types';

export type ValidationResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ValidationResult => ({ ok: false, error });

/** يتحقق من بيانات هدف قبل الحفظ. كل الرسائل بالعربية. */
export function validateEventInput(state: TournamentState, input: EventInput): ValidationResult {
  const match = state.matches.find((m) => m.id === input.matchId);
  if (!match) return fail('يرجى اختيار المباراة.');

  if (!input.teamId) return fail('يرجى اختيار الفريق.');
  if (input.teamId !== match.homeId && input.teamId !== match.awayId) {
    return fail('الفريق المختار ليس طرفاً في هذه المباراة.');
  }

  if (!input.scorerId) return fail('يرجى اختيار اللاعب المسجّل.');
  const scorer = state.players.find((p) => p.id === input.scorerId);
  if (!scorer) return fail('اللاعب المسجّل غير موجود.');
  if (scorer.teamId !== input.teamId) return fail('اللاعب المسجّل لا ينتمي إلى الفريق المختار.');

  if (input.assistId) {
    const assister = state.players.find((p) => p.id === input.assistId);
    if (!assister) return fail('اللاعب صانع الهدف غير موجود.');
    if (assister.id === scorer.id) return fail('لا يمكن أن يكون صانع الهدف هو نفسه المسجّل.');
    if (assister.teamId !== input.teamId) return fail('صانع الهدف يجب أن يكون من نفس الفريق.');
  }

  if (input.minute !== undefined) {
    if (!Number.isInteger(input.minute) || input.minute < 1 || input.minute > 120) {
      return fail('دقيقة الهدف يجب أن تكون رقماً صحيحاً بين 1 و120.');
    }
  }
  return { ok: true };
}

export function validateScore(home: number, away: number): ValidationResult {
  const valid = (n: number) => Number.isInteger(n) && n >= 0 && n <= 99;
  if (!valid(home) || !valid(away)) return fail('النتيجة يجب أن تكون أرقاماً صحيحة بين 0 و99.');
  return { ok: true };
}
