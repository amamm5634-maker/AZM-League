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
export const ROSTERS: Record<string, RosterEntry[]> = {
  // كلية الحاسوب: قائمة مبدئية للتجربة، قابلة للتعديل قبل التسجيل النهائي.
  'حاسوب': [
    { name: 'حسين علي', number: 1, position: 'حارس' },
    { name: 'طيفور عبد الله', number: 2, position: 'حارس' },
    { name: 'محسن شارلوس', number: 3, position: 'مدافع' },
    { name: 'فضل عبدو', number: 4, position: 'مدافع' },
    { name: 'مصطفى عبد القادر', number: 5, position: 'مدافع' },
    { name: 'أحمد محمد خالد', number: 6, position: 'مدافع' },
    { name: 'أحمد أبو عبيده', number: 7, position: 'مدافع' },
    { name: 'أواب', number: 8, position: 'مدافع', photo: 'players/awab.jpg' },
    { name: 'أكرم', number: 9, position: 'مدافع' },
    { name: 'معاوية زين العابدين', number: 10, position: 'مدافع' },
    { name: 'محمد يوسف', number: 11, position: 'مدافع' },
    { name: 'عثمان أسامة', number: 12, position: 'مدافع' },
    { name: 'السماني فتح الدين', number: 13, position: 'وسط' },
    { name: 'مروان ياسين', number: 14, position: 'وسط' },
    { name: 'عبد الباسط بره', number: 15, position: 'وسط' },
    { name: 'عثمان التيكل', number: 16, position: 'وسط' },
    { name: 'محمد إمام', number: 17, position: 'وسط' },
    { name: 'غسان بكري محمد عثمان', number: 18, position: 'وسط' },
    { name: 'عبد السلام يوسف', number: 19, position: 'وسط' },
    { name: 'أحمد داؤود', number: 20, position: 'وسط' },
    { name: 'عمر تيسير', number: 21, position: 'وسط' },
    { name: 'أحمد محمد أحمد', number: 22, position: 'وسط' },
    { name: 'محمد بشير', number: 23, position: 'وسط' },
    { name: 'مجتبى الليدر', number: 24, position: 'وسط' },
    { name: 'البشرى الصادق', number: 25, position: 'جناح' },
    { name: 'الطيب خلف الله', number: 26, position: 'جناح' },
    { name: 'فيصل حسن', number: 27, position: 'جناح' },
    { name: 'عمر نصر الدين', number: 28, position: 'جناح' },
    { name: 'متوكل عبد الرحيم', number: 29, position: 'جناح' },
    { name: 'عبد المنعم عاطف', number: 30, position: 'مهاجم' },
    { name: 'عبد السلام الخير', number: 31, position: 'مهاجم' },
  ],
};
