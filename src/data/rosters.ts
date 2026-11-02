import type { Position } from '../types';

export interface RosterEntry {
  name: string;
  number: number;
  position: Position;
  /** مسار الصورة داخل مجلد public، مثل: 'players/ahmed-hendasa.jpg' (اختياري) */
  photo?: string;
}

/**
 * ===== قوائم اللاعبين =====
 * المفتاح هو اسم الكلية كما في القائمة (مثل 'هندسة'). اتركها فارغة لحد وصول القوائم من الكليات.
 * المراكز المسموحة: 'حارس' | 'مدافع' | 'وسط' | 'جناح' | 'مهاجم'
 * رقم القميص يجب ألا يتكرر داخل الفريق الواحد.
 *
 * مثال:
 *   'هندسة': [
 *     { name: 'اسم اللاعب', number: 1, position: 'حارس', photo: 'players/hendasa-1.jpg' },
 *     { name: 'لاعب آخر', number: 9, position: 'مهاجم' },
 *   ],
 */
export const ROSTERS: Record<string, RosterEntry[]> = {};
