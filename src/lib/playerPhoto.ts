import type { Player } from '../types';

/** هل الساعة h ضمن النافذة [from, to) بتوقيت الجهاز؟ (from > to تعني عبور منتصف الليل) */
export function inWindow(h: number, from: number, to: number): boolean {
  return from <= to ? h >= from && h < to : h >= from || h < to;
}

/** صورة اللاعب الآن: أول نافذة مطابقة لساعة اليوم، وإلا الصورة الأساسية */
export function photoFor(player: Pick<Player, 'photo' | 'photos'>, now: Date = new Date()): string | undefined {
  const h = now.getHours();
  return player.photos?.find((p) => inWindow(h, p.from, p.to))?.src ?? player.photo;
}
