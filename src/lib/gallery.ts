import type { GalleryPhoto, Match, TournamentState } from '../types';

export const PHOTO_MAX_BYTES = 3 * 1024 * 1024; // نفس حد bucket المسمى media
export const PHOTO_MIME = ['image/webp', 'image/jpeg'] as const;
export const CAPTION_MAX = 200;
/** الخطة المجانية في Supabase: 500 ميجابايت للتخزين (تشمل صور الأخبار أيضاً) */
export const FREE_STORAGE_BYTES = 500 * 1024 * 1024;

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}

/** صور مباراة معيّنة (الأحدث أولاً) */
export function photosForMatch(photos: GalleryPhoto[], matchId: string): GalleryPhoto[] {
  return photos.filter((p) => p.matchId === matchId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** يحسب المقاس بعد التصغير مع الحفاظ على النسبة، ولا يكبّر أبداً */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (longSide <= maxSide || longSide <= 0) return { width, height };
  const k = maxSide / longSide;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

export function extForMime(mime: string): 'webp' | 'jpg' | null {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/jpeg') return 'jpg';
  return null;
}

/** اسم المباراة للعرض: "هندسة × تمريض" */
export function matchLabel(state: TournamentState, match: Match): string {
  const h = state.teams.find((t) => t.id === match.homeId);
  const a = state.teams.find((t) => t.id === match.awayId);
  return `${h?.nickname ?? '؟'} × ${a?.nickname ?? '؟'}`;
}
