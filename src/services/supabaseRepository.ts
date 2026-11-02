import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventInput, GalleryPhoto, Match, MatchEvent, NewsItem, TournamentState } from '../types';
import { buildSeed } from '../data/seed';
import { adjustScore } from '../lib/scoring';
import { validateEventInput, validateScore } from '../lib/validation';
import { CAPTION_MAX, PHOTO_MAX_BYTES, extForMime } from '../lib/gallery';
import type { NewsInput, PhotoInput, PhotoPage, PhotoQuery, PhotoUsage, Result, TournamentRepository } from './repository';

const PERMISSION_ERROR = 'ليست لديك صلاحية لهذا الإجراء. تأكد من تسجيل الدخول بحساب مخوّل.';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

type DbError = { message?: string; code?: string } | null | undefined;

function fail(error: DbError, fallback: string): { ok: false; error: string } {
  const msg = error?.message ?? '';
  if (error?.code === '42501' || /row-level security|permission denied|not authorized/i.test(msg)) {
    return { ok: false, error: PERMISSION_ERROR };
  }
  return { ok: false, error: `${fallback}${msg ? ` (${msg})` : ''}` };
}

interface MatchRow { match_id: string; home_score: number; away_score: number; status: Match['status']; motm_player_id: string | null }
interface EventRow { id: string; match_id: string; team_id: string; scorer_id: string; assist_id: string | null; minute: number | null }
interface PhotoRow {
  id: string;
  path: string;
  thumb_path: string;
  match_id: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}
interface NewsRow { id: string; title: string; summary: string; tag: string; image_url: string | null; published_at: string }

/**
 * تخزين حي في Supabase. المحتوى الثابت (الكليات، اللاعبون، الجدول) من ملفات البيانات،
 * والنتائج والأهداف والأخبار من قاعدة البيانات. الصلاحيات تُفرض في الخادم عبر RLS.
 */
export class SupabaseRepository implements TournamentRepository {
  readonly kind = 'supabase' as const;

  constructor(
    private readonly db: SupabaseClient,
    private readonly seedFn: () => TournamentState = buildSeed,
  ) {}

  async load(): Promise<TournamentState> {
    const fresh = this.seedFn();
    const [ms, ev, nw] = await Promise.all([
      this.db.from('match_state').select('match_id,home_score,away_score,status,motm_player_id'),
      this.db
        .from('goal_events')
        .select('id,match_id,team_id,scorer_id,assist_id,minute')
        .order('created_at', { ascending: true }),
      this.db.from('news').select('id,title,summary,tag,image_url,published_at').order('published_at', { ascending: false }),
    ]);
    const err = ms.error ?? ev.error ?? nw.error;
    if (err) throw new Error(err.message);

    const rows = new Map((ms.data as MatchRow[]).map((r) => [r.match_id, r]));
    const matches = fresh.matches.map((m) => {
      const r = rows.get(m.id);
      return r ? { ...m, homeScore: r.home_score, awayScore: r.away_score, status: r.status, motmId: r.motm_player_id ?? undefined } : m;
    });
    const matchIds = new Set(matches.map((m) => m.id));
    const events: MatchEvent[] = (ev.data as EventRow[])
      .filter((e) => matchIds.has(e.match_id))
      .map((e) => ({
        id: e.id,
        matchId: e.match_id,
        type: 'goal' as const,
        teamId: e.team_id,
        scorerId: e.scorer_id,
        assistId: e.assist_id ?? undefined,
        minute: e.minute ?? undefined,
      }));
    const dbNews: NewsItem[] = (nw.data as NewsRow[]).map((n) => ({
      id: `db:${n.id}`,
      title: n.title,
      summary: n.summary,
      tag: n.tag,
      date: n.published_at,
      image: n.image_url ?? undefined,
    }));
    return { ...fresh, matches, events, news: [...dbNews, ...fresh.news] };
  }

  private async done(message: string): Promise<Result<TournamentState>> {
    try {
      return { ok: true, data: await this.load(), message };
    } catch {
      return { ok: false, error: 'تم الحفظ لكن تعذّر تحديث العرض. حدّث الصفحة.' };
    }
  }

  private async saveMatches(...matches: (Match | undefined)[]): Promise<{ ok: false; error: string } | null> {
    const unique = [...new Map(matches.filter((m): m is Match => !!m).map((m) => [m.id, m])).values()];
    if (unique.length === 0) return null;
    const { error } = await this.db.from('match_state').upsert(
      unique.map((m) => ({
        match_id: m.id,
        home_score: m.homeScore,
        away_score: m.awayScore,
        status: m.status,
        motm_player_id: m.motmId ?? null,
        updated_at: new Date().toISOString(),
      })),
    );
    return error ? fail(error, 'تعذّر حفظ النتيجة') : null;
  }

  async addEvent(input: EventInput): Promise<Result<TournamentState>> {
    const state = await this.load();
    const check = validateEventInput(state, input);
    if (!check.ok) return check;
    const match = state.matches.find((m) => m.id === input.matchId)!;

    const ins = await this.db.from('goal_events').insert({
      match_id: input.matchId,
      team_id: input.teamId,
      scorer_id: input.scorerId,
      assist_id: input.assistId || null,
      minute: input.minute ?? null,
    });
    if (ins.error) return fail(ins.error, 'تعذّر تسجيل الهدف');

    adjustScore(match, input.teamId, +1);
    if (match.status === 'scheduled') match.status = 'live';
    const saved = await this.saveMatches(match);
    if (saved) return saved;
    return this.done('تم تسجيل الهدف وتحديث النتيجة والإحصاءات.');
  }

  async updateEvent(eventId: string, input: EventInput): Promise<Result<TournamentState>> {
    const state = await this.load();
    const existing = state.events.find((e) => e.id === eventId);
    if (!existing) return { ok: false, error: 'الحدث غير موجود، ربما تم حذفه.' };
    const check = validateEventInput(state, input);
    if (!check.ok) return check;

    const oldMatch = state.matches.find((m) => m.id === existing.matchId);
    const newMatch = state.matches.find((m) => m.id === input.matchId)!;
    if (oldMatch) adjustScore(oldMatch, existing.teamId, -1);
    adjustScore(newMatch, input.teamId, +1);
    if (newMatch.status === 'scheduled') newMatch.status = 'live';

    const upd = await this.db
      .from('goal_events')
      .update({
        match_id: input.matchId,
        team_id: input.teamId,
        scorer_id: input.scorerId,
        assist_id: input.assistId || null,
        minute: input.minute ?? null,
      })
      .eq('id', eventId);
    if (upd.error) return fail(upd.error, 'تعذّر تعديل الهدف');

    const saved = await this.saveMatches(oldMatch, newMatch);
    if (saved) return saved;
    return this.done('تم تعديل الهدف وتحديث النتيجة والإحصاءات.');
  }

  async deleteEvent(eventId: string): Promise<Result<TournamentState>> {
    const state = await this.load();
    const existing = state.events.find((e) => e.id === eventId);
    if (!existing) return { ok: false, error: 'الحدث غير موجود، ربما تم حذفه.' };
    const match = state.matches.find((m) => m.id === existing.matchId);
    if (match) adjustScore(match, existing.teamId, -1);

    const del = await this.db.from('goal_events').delete().eq('id', eventId);
    if (del.error) return fail(del.error, 'تعذّر حذف الهدف');
    const saved = await this.saveMatches(match);
    if (saved) return saved;
    return this.done('تم حذف الهدف وتحديث النتيجة والإحصاءات.');
  }

  async setScore(matchId: string, home: number, away: number): Promise<Result<TournamentState>> {
    const state = await this.load();
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return { ok: false, error: 'يرجى اختيار المباراة.' };
    const check = validateScore(home, away);
    if (!check.ok) return check;
    match.homeScore = home;
    match.awayScore = away;
    if (match.status === 'scheduled') match.status = 'live';
    const saved = await this.saveMatches(match);
    if (saved) return saved;
    return this.done('تم حفظ النتيجة.');
  }

  async setManOfMatch(matchId: string, playerId: string | null): Promise<Result<TournamentState>> {
    const state = await this.load();
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return { ok: false, error: 'يرجى اختيار المباراة.' };
    if (playerId) {
      const pl = state.players.find((x) => x.id === playerId);
      if (!pl || (pl.teamId !== match.homeId && pl.teamId !== match.awayId)) {
        return { ok: false, error: 'اللاعب لا ينتمي لأحد فريقي المباراة.' };
      }
    }
    match.motmId = playerId ?? undefined;
    const saved = await this.saveMatches(match);
    if (saved) return saved;
    return this.done(playerId ? 'تم حفظ أفضل لاعب في المباراة.' : 'تم إلغاء اختيار أفضل لاعب.');
  }

  async completeMatch(matchId: string): Promise<Result<TournamentState>> {
    const state = await this.load();
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) return { ok: false, error: 'يرجى اختيار المباراة.' };
    if (match.status === 'completed') return { ok: false, error: 'هذه المباراة منتهية بالفعل.' };
    match.status = 'completed';
    const saved = await this.saveMatches(match);
    if (saved) return saved;
    return this.done('تم إنهاء المباراة وتحديث جدول الترتيب.');
  }

  async reset(): Promise<Result<TournamentState>> {
    return { ok: false, error: 'إعادة الضبط غير متاحة في النسخة الحية حمايةً للبيانات.' };
  }

  async addNews(input: NewsInput): Promise<Result<TournamentState>> {
    const title = input.title.trim();
    const summary = input.summary.trim();
    if (title.length < 3) return { ok: false, error: 'اكتب عنواناً للخبر (3 أحرف على الأقل).' };
    if (summary.length < 3) return { ok: false, error: 'اكتب نص الخبر (3 أحرف على الأقل).' };

    let imageUrl: string | null = null;
    if (input.image) {
      const file = input.image;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return { ok: false, error: 'نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP.' };
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return { ok: false, error: 'الصورة كبيرة. الحد الأقصى 3 ميجابايت.' };
      }
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `news/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await this.db.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) return fail(up.error, 'تعذّر رفع الصورة');
      imageUrl = this.db.storage.from('media').getPublicUrl(path).data.publicUrl;
    }

    const ins = await this.db.from('news').insert({ title, summary, tag: input.tag || 'خبر', image_url: imageUrl });
    if (ins.error) return fail(ins.error, 'تعذّر نشر الخبر');
    return this.done('تم نشر الخبر.');
  }

  async deleteNews(id: string): Promise<Result<TournamentState>> {
    if (!id.startsWith('db:')) {
      return { ok: false, error: 'هذا الخبر ثابت داخل ملفات الموقع، ويُحذف من seed.ts.' };
    }
    const del = await this.db.from('news').delete().eq('id', id.slice(3));
    if (del.error) return fail(del.error, 'تعذّر حذف الخبر');
    return this.done('تم حذف الخبر.');
  }

  /* ---------------- معرض الصور ---------------- */
  private publicUrl(path: string): string {
    return this.db.storage.from('media').getPublicUrl(path).data.publicUrl;
  }

  async loadPhotos(query: PhotoQuery = {}): Promise<PhotoPage> {
    const limit = Math.min(Math.max(query.limit ?? 24, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    let q = this.db
      .from('gallery_photos')
      .select('id,path,thumb_path,match_id,caption,width,height,created_at')
      .order('created_at', { ascending: false });
    if (query.matchId) q = q.eq('match_id', query.matchId);
    // نطلب صورة زيادة لنعرف هل توجد صفحة تالية بدون استعلام عدّ منفصل
    const { data, error } = await q.range(offset, offset + limit);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as PhotoRow[];
    const photos: GalleryPhoto[] = rows.slice(0, limit).map((r) => ({
      id: r.id,
      url: this.publicUrl(r.path),
      thumb: this.publicUrl(r.thumb_path),
      matchId: r.match_id ?? undefined,
      caption: r.caption ?? undefined,
      createdAt: r.created_at,
      width: r.width ?? undefined,
      height: r.height ?? undefined,
    }));
    return { photos, hasMore: rows.length > limit };
  }

  async addPhoto(input: PhotoInput): Promise<Result<GalleryPhoto>> {
    const ext = extForMime(input.file.type);
    const thumbExt = extForMime(input.thumb.type);
    if (!ext || !thumbExt) return { ok: false, error: 'نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP.' };
    if (input.file.size > PHOTO_MAX_BYTES || input.thumb.size > PHOTO_MAX_BYTES) {
      return { ok: false, error: 'الصورة كبيرة. الحد الأقصى 3 ميجابايت بعد الضغط.' };
    }
    const caption = input.caption?.trim() || null;
    if (caption && caption.length > CAPTION_MAX) return { ok: false, error: `التعليق طويل (الحد ${CAPTION_MAX} حرفاً).` };

    const base = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${base}.${ext}`;
    const thumbPath = `${base}-t.${thumbExt}`;
    const bucket = this.db.storage.from('media');

    const up = await bucket.upload(path, input.file, { contentType: input.file.type, upsert: false });
    if (up.error) return fail(up.error, 'تعذّر رفع الصورة');
    const upThumb = await bucket.upload(thumbPath, input.thumb, { contentType: input.thumb.type, upsert: false });
    if (upThumb.error) {
      await bucket.remove([path]);
      return fail(upThumb.error, 'تعذّر رفع الصورة المصغّرة');
    }

    const ins = await this.db
      .from('gallery_photos')
      .insert({
        path,
        thumb_path: thumbPath,
        match_id: input.matchId || null,
        caption,
        width: input.width,
        height: input.height,
        size_bytes: input.file.size + input.thumb.size,
      })
      .select('id,path,thumb_path,match_id,caption,width,height,created_at')
      .single();
    if (ins.error || !ins.data) {
      // لا نترك ملفات يتيمة تستهلك المساحة
      await bucket.remove([path, thumbPath]);
      return fail(ins.error, 'تعذّر حفظ الصورة');
    }
    const r = ins.data as PhotoRow;
    return {
      ok: true,
      message: 'تم رفع الصورة.',
      data: {
        id: r.id,
        url: this.publicUrl(r.path),
        thumb: this.publicUrl(r.thumb_path),
        matchId: r.match_id ?? undefined,
        caption: r.caption ?? undefined,
        createdAt: r.created_at,
        width: r.width ?? undefined,
        height: r.height ?? undefined,
      },
    };
  }

  async deletePhoto(id: string): Promise<Result> {
    const found = await this.db.from('gallery_photos').select('path,thumb_path').eq('id', id).maybeSingle();
    if (found.error) return fail(found.error, 'تعذّر حذف الصورة');
    if (!found.data) return { ok: false, error: 'الصورة غير موجودة، ربما حُذفت.' };
    const row = found.data as { path: string; thumb_path: string };

    const del = await this.db.from('gallery_photos').delete().eq('id', id);
    if (del.error) return fail(del.error, 'تعذّر حذف الصورة');
    const rm = await this.db.storage.from('media').remove([row.path, row.thumb_path]);
    if (rm.error) {
      return { ok: true, data: undefined, message: 'حُذفت الصورة من المعرض، لكن تعذّر حذف ملفها من التخزين (تحقق من صلاحياتك).' };
    }
    return { ok: true, data: undefined, message: 'تم حذف الصورة.' };
  }

  async photoUsage(): Promise<PhotoUsage | null> {
    const { data, error } = await this.db.rpc('gallery_usage');
    if (error || !data) return null;
    const row = (Array.isArray(data) ? data[0] : data) as { count?: number | string; bytes?: number | string } | undefined;
    if (!row) return null;
    return { count: Number(row.count ?? 0), bytes: Number(row.bytes ?? 0) };
  }
}
