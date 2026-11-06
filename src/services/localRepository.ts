import type { SubInput, CardInput, EventInput, GalleryPhoto, Match, MatchEvent, MatchMessage, PredictionChoice, PredictionCounts, TournamentState } from '../types';
import { buildSeed } from '../data/seed';
import { validateEventInput, validateScore } from '../lib/validation';
import { adjustScore } from '../lib/scoring';
import { validateLineup } from '../lib/lineup';
import { planCard } from '../lib/cards';
import { canDeleteSub, validateSub } from '../lib/subs';
import type { NewsInput, PhotoInput, PhotoPage, PhotoQuery, PhotoUsage, Result, TournamentRepository } from './repository';

export const STORAGE_KEY = 'azm-league:v2';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function looksValid(value: unknown): value is TournamentState {
  const v = value as Partial<TournamentState> | null;
  return !!v && Array.isArray(v.matches) && Array.isArray(v.events);
}

/**
 * المحتوى (الفرق، اللاعبون، الأخبار، الجدول) يأتي دائماً من ملفات البيانات،
 * والمحفوظ في المتصفح هو فقط النتائج والحالة والأحداث. هكذا أي تعديل على الملفات يظهر مباشرة.
 */
function merge(fresh: TournamentState, stored: TournamentState): TournamentState {
  const byId = new Map(stored.matches.map((m) => [m.id, m]));
  const matches = fresh.matches.map((m) => {
    const s = byId.get(m.id);
    if (!s || s.homeId !== m.homeId || s.awayId !== m.awayId) return m;
    return { ...m, homeScore: s.homeScore, awayScore: s.awayScore, status: s.status };
  });
  const matchIds = new Set(matches.map((m) => m.id));
  const playerIds = new Set(fresh.players.map((p) => p.id));
  const events = stored.events.filter((e) => matchIds.has(e.matchId) && playerIds.has(e.scorerId));
  const lineups = (stored.lineups ?? []).filter((l) => matchIds.has(l.matchId) && l.playerIds.every((id) => playerIds.has(id)));
  const cards = (stored.cards ?? []).filter((c) => matchIds.has(c.matchId) && playerIds.has(c.playerId));
  const subs = (stored.subs ?? []).filter((s) => matchIds.has(s.matchId) && playerIds.has(s.outId) && playerIds.has(s.inId));
  return { ...fresh, matches, events, lineups, cards, subs };
}

/**
 * تخزين تجريبي في المتصفح (localStorage).
 * ليس تخزيناً آمناً ولا مشتركاً بين الأجهزة — يُستبدل بـ Supabase لاحقاً.
 */
export class LocalStorageRepository implements TournamentRepository {
  readonly kind = 'local' as const;
  private state: TournamentState | null = null;

  constructor(private readonly seedFn: () => TournamentState = buildSeed) {}

  private read(): TournamentState {
    if (this.state) return this.state;
    const fresh = this.seedFn();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (looksValid(parsed)) {
          this.state = merge(fresh, parsed);
          return this.state;
        }
      }
    } catch {
      // التخزين غير متاح أو البيانات تالفة: نرجع للبيانات الأساسية
    }
    this.state = fresh;
    return this.state;
  }

  private save(state: TournamentState): boolean {
    this.state = state;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  private commit(state: TournamentState, message: string): Result<TournamentState> {
    const saved = this.save(state);
    return {
      ok: true,
      data: clone(state),
      message: saved ? message : `${message} (تعذّر الحفظ في المتصفح، ستضيع التغييرات عند التحديث)`,
    };
  }

  async load(): Promise<TournamentState> {
    return clone(this.read());
  }

  async addEvent(input: EventInput): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const check = validateEventInput(state, input);
    if (!check.ok) return check;
    const match = state.matches.find((m) => m.id === input.matchId)!;
    const event: MatchEvent = {
      id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      matchId: input.matchId,
      type: 'goal',
      teamId: input.teamId,
      scorerId: input.scorerId,
      assistId: input.assistId || undefined,
      minute: input.minute,
    };
    state.events.push(event);
    adjustScore(match, input.teamId, +1);
    if (match.status === 'scheduled') match.status = 'live';
    return this.commit(state, 'تم تسجيل الهدف وتحديث النتيجة والإحصاءات.');
  }

  async updateEvent(eventId: string, input: EventInput): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const existing = state.events.find((e) => e.id === eventId);
    if (!existing) return { ok: false, error: 'الحدث غير موجود، ربما تم حذفه.' };
    const check = validateEventInput(state, input);
    if (!check.ok) return check;

    const oldMatch = state.matches.find((m) => m.id === existing.matchId);
    const newMatch = state.matches.find((m) => m.id === input.matchId)!;
    if (oldMatch) adjustScore(oldMatch, existing.teamId, -1);
    adjustScore(newMatch, input.teamId, +1);
    if (newMatch.status === 'scheduled') newMatch.status = 'live';

    existing.matchId = input.matchId;
    existing.teamId = input.teamId;
    existing.scorerId = input.scorerId;
    existing.assistId = input.assistId || undefined;
    existing.minute = input.minute;
    return this.commit(state, 'تم تعديل الهدف وتحديث النتيجة والإحصاءات.');
  }

  async deleteEvent(eventId: string): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const existing = state.events.find((e) => e.id === eventId);
    if (!existing) return { ok: false, error: 'الحدث غير موجود، ربما تم حذفه.' };
    const match = state.matches.find((m) => m.id === existing.matchId);
    if (match) adjustScore(match, existing.teamId, -1);
    state.events = state.events.filter((e) => e.id !== eventId);
    return this.commit(state, 'تم حذف الهدف وتحديث النتيجة والإحصاءات.');
  }

  async setScore(matchId: string, home: number, away: number): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return { ok: false, error: 'يرجى اختيار المباراة.' };
    const check = validateScore(home, away);
    if (!check.ok) return check;
    match.homeScore = home;
    match.awayScore = away;
    if (match.status === 'scheduled') match.status = 'live';
    return this.commit(state, 'تم حفظ النتيجة.');
  }

  async completeMatch(matchId: string): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return { ok: false, error: 'يرجى اختيار المباراة.' };
    if (match.status === 'completed') return { ok: false, error: 'هذه المباراة منتهية بالفعل.' };
    match.status = 'completed';
    return this.commit(state, 'تم إنهاء المباراة وتحديث جدول الترتيب.');
  }

  async setManOfMatch(matchId: string, playerId: string | null): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return { ok: false, error: 'يرجى اختيار المباراة.' };
    if (playerId) {
      const p = state.players.find((x) => x.id === playerId);
      if (!p || (p.teamId !== match.homeId && p.teamId !== match.awayId)) {
        return { ok: false, error: 'اللاعب لا ينتمي لأحد فريقي المباراة.' };
      }
    }
    match.motmId = playerId ?? undefined;
    return this.commit(state, playerId ? 'تم حفظ أفضل لاعب في المباراة.' : 'تم إلغاء اختيار أفضل لاعب.');
  }

  async addCard(input: CardInput): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const plan = planCard(state.cards ?? [], input, state.matches.find((m) => m.id === input.matchId), state.players);
    if (!plan.ok) return plan;
    const added = plan.kinds.map((kind) => ({ id: `c${Date.now()}${Math.random().toString(36).slice(2, 6)}${kind[0]}`, matchId: input.matchId, teamId: input.teamId, playerId: input.playerId, kind, minute: input.minute }));
    state.cards = [...(state.cards ?? []), ...added];
    return this.commit(state, plan.kinds.length === 2 ? 'أصفر ثانٍ: سُجّلت الحمراء تلقائياً.' : 'سُجّلت البطاقة.');
  }

  async deleteCard(cardId: string): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    state.cards = (state.cards ?? []).filter((c) => c.id !== cardId);
    return this.commit(state, 'حُذفت البطاقة.');
  }

  async addSub(input: SubInput): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const problem = validateSub(
      input,
      state.matches.find((m) => m.id === input.matchId),
      state.lineups?.find((l) => l.matchId === input.matchId && l.teamId === input.teamId),
      state.subs ?? [],
      state.cards ?? [],
      state.players,
    );
    if (problem) return { ok: false, error: problem };
    state.subs = [...(state.subs ?? []), { id: `s${Date.now()}${Math.random().toString(36).slice(2, 6)}`, ...input }];
    return this.commit(state, 'سُجّل التبديل.');
  }

  async deleteSub(subId: string): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const sub = (state.subs ?? []).find((s) => s.id === subId);
    if (!sub) return { ok: false, error: 'التبديل غير موجود، ربما حُذف.' };
    if (!canDeleteSub(state.subs ?? [], sub)) return { ok: false, error: 'احذف التبديل اللاحق أولاً (اللاعب الداخل خرج بعدها).' };
    state.subs = (state.subs ?? []).filter((s) => s.id !== subId);
    return this.commit(state, 'حُذف التبديل.');
  }

  async resetMatch(matchId: string): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return { ok: false, error: 'يرجى اختيار المباراة.' };
    match.homeScore = 0;
    match.awayScore = 0;
    match.status = 'scheduled';
    match.motmId = undefined;
    state.events = state.events.filter((e) => e.matchId !== matchId);
    state.cards = (state.cards ?? []).filter((c) => c.matchId !== matchId);
    state.subs = (state.subs ?? []).filter((s) => s.matchId !== matchId);
    return this.commit(state, 'أُعيدت المباراة إلى حالتها الأولى.');
  }

  async saveLineup(matchId: string, teamId: string, playerIds: string[]): Promise<Result<TournamentState>> {
    const state = clone(this.read());
    const match = state.matches.find((m) => m.id === matchId);
    if (!match || (match.homeId !== teamId && match.awayId !== teamId)) return { ok: false, error: 'الفريق ليس طرفاً في هذه المباراة.' };
    const problem = validateLineup(state.players.filter((p) => p.teamId === teamId), playerIds);
    if (problem) return { ok: false, error: problem };
    const rest = (state.lineups ?? []).filter((l) => !(l.matchId === matchId && l.teamId === teamId));
    state.lineups = [...rest, { matchId, teamId, playerIds: [...playerIds], updatedAt: new Date().toISOString() }];
    return this.commit(state, 'تم حفظ التشكيلة.');
  }

  async reset(): Promise<Result<TournamentState>> {
    return this.commit(this.seedFn(), 'تمت إعادة ضبط النتائج والأحداث.');
  }

  async addNews(_input: NewsInput): Promise<Result<TournamentState>> {
    return { ok: false, error: 'إضافة الأخبار من اللوحة تتطلب ربط Supabase. حالياً الأخبار تُضاف من ملف seed.ts.' };
  }

  async deleteNews(_id: string): Promise<Result<TournamentState>> {
    return { ok: false, error: 'حذف الأخبار من اللوحة يتطلب ربط Supabase.' };
  }

  // المعرض يحتاج تخزين ملفات حقيقياً، لذلك لا يعمل إلا مع Supabase
  async loadPhotos(_query?: PhotoQuery): Promise<PhotoPage> {
    return { photos: [], hasMore: false };
  }

  async addPhoto(_input: PhotoInput): Promise<Result<GalleryPhoto>> {
    return { ok: false, error: 'رفع الصور يتطلب ربط Supabase.' };
  }

  async deletePhoto(_id: string): Promise<Result> {
    return { ok: false, error: 'حذف الصور يتطلب ربط Supabase.' };
  }

  async photoUsage(): Promise<PhotoUsage | null> {
    return null;
  }

  async loadRoundPhotos(): Promise<GalleryPhoto[]> {
    return [];
  }

  async loadPredictionCounts(_matchId: string): Promise<PredictionCounts> {
    return { home: 0, draw: 0, away: 0 };
  }

  async submitPrediction(_m: string, _c: PredictionChoice, _d: string): Promise<Result> {
    return { ok: false, error: 'التوقعات تتطلب ربط Supabase.' };
  }

  async loadMessages(_matchId: string): Promise<MatchMessage[]> {
    return [];
  }

  async submitMessage(_m: string, _a: string, _b: string, _d: string): Promise<Result> {
    return { ok: false, error: 'رسائل المدرجات تتطلب ربط Supabase.' };
  }

  async loadPendingMessages(): Promise<MatchMessage[]> {
    return [];
  }

  async reviewMessage(_id: string, _s: 'approved' | 'rejected'): Promise<Result> {
    return { ok: false, error: 'مراجعة الرسائل تتطلب ربط Supabase.' };
  }

  async setRoundPhoto(_id: string, _round: number | null): Promise<Result> {
    return { ok: false, error: 'اختيار صورة الجولة يتطلب ربط Supabase.' };
  }
}
