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
  // كلية علوم الحاسوب: القائمة المختارة للدوري (22 لاعب). أرقام القمصان تسلسلية بترتيب القائمة، تُعدَّل عند وصول الأرقام الفعلية.
  'حاسوب': [
    { name: 'حسين علي', number: 1, position: 'حارس' },
    { name: 'طيفور عبد الله', number: 2, position: 'حارس' },
    { name: 'محسن تشارلز', number: 3, position: 'مدافع' },
    { name: 'فضل عبدو', number: 4, position: 'مدافع' },
    { name: 'أحمد عاطف', number: 5, position: 'مدافع' },
    { name: 'أكرم', number: 6, position: 'مدافع' },
    { name: 'معاوية زين العابدين', number: 7, position: 'مدافع' },
    { name: 'محمد يوسف', number: 8, position: 'مدافع' },
    { name: 'عثمان أسامة', number: 9, position: 'مدافع' },
    { name: 'السماني فتح الدين', number: 10, position: 'وسط' },
    { name: 'محمد إمام', number: 11, position: 'وسط' },
    { name: 'غسان بكري محمد عثمان', number: 12, position: 'وسط' },
    { name: 'أحمد محمد أحمد', number: 13, position: 'وسط' },
    { name: 'عمر تيسير', number: 14, position: 'وسط' },
    { name: 'عثمان التيكل', number: 15, position: 'وسط' },
    { name: 'الطيب خلف الله', number: 16, position: 'جناح' },
    { name: 'أواب بشكه', number: 17, position: 'جناح', photo: 'players/awab.jpg' },
    { name: 'فيصل حسن', number: 18, position: 'جناح', photo: 'players/faisal-hassan.jpg' },
    { name: 'متوكل عبد الرحيم', number: 19, position: 'جناح' },
    { name: 'مظفر', number: 20, position: 'جناح' },
    { name: 'عبد المنعم عاطف', number: 21, position: 'مهاجم' },
    { name: 'عبد السلام يوسف', number: 22, position: 'مهاجم' },
  ],
  // كلية الطب: كشف 20 لاعب (الظهير مسجل كمدافع). أرقام القمصان تسلسلية بترتيب الكشف، تُعدَّل عند وصول الأرقام الفعلية.
  'طب': [
    { name: 'أحمد صالح', number: 1, position: 'حارس', photo: 'players/med-12.jpg' },
    { name: 'محمد عمر', number: 2, position: 'مدافع', photo: 'players/med-02.jpg' },
    { name: 'أحمد محيي الدين', number: 3, position: 'مدافع', photo: 'players/med-03.jpg' },
    { name: 'عمر أحمد', number: 4, position: 'مدافع', photo: 'players/med-04.jpg' },
    { name: 'مصطفى عوض الجيد', number: 5, position: 'مدافع', photo: 'players/med-05.jpg' },
    { name: 'أحمد الهيثم', number: 6, position: 'مدافع', photo: 'players/med-01.jpg' },
    { name: 'محمد معاوية', number: 7, position: 'مدافع', photo: 'players/med-06.jpg' },
    { name: 'أبو القاسم الطاهر', number: 8, position: 'مدافع', photo: 'players/med-07.jpg' },
    { name: 'حماد فرح', number: 9, position: 'مدافع', photo: 'players/med-08.jpg' },
    { name: 'بابكر الحسين', number: 10, position: 'مدافع', photo: 'players/med-09.jpg' },
    { name: 'جمال الدين هاشم', number: 11, position: 'وسط', photo: 'players/med-10.jpg' },
    { name: 'أيمن عماد الدين', number: 12, position: 'وسط', photo: 'players/med-11.jpg' },
    { name: 'أكرم محمود', number: 13, position: 'وسط', photo: 'players/med-20.jpg' },
    { name: 'مجتبى آدم', number: 14, position: 'وسط', photo: 'players/med-13.jpg' },
    { name: 'محمد بشير', number: 15, position: 'جناح', photo: 'players/med-14.jpg' },
    { name: 'محمد البدوي', number: 16, position: 'جناح', photo: 'players/med-15.jpg' },
    { name: 'مصطفى أحمد', number: 17, position: 'جناح', photo: 'players/med-16.jpg' },
    { name: 'عبدالمنعم إسماعيل', number: 18, position: 'جناح', photo: 'players/med-17.jpg' },
    { name: 'أحمد إيهاب', number: 19, position: 'مهاجم', photo: 'players/med-18.jpg' },
    { name: 'أبوبكر الأمين', number: 20, position: 'مهاجم', photo: 'players/med-19.jpg' },
  ],
};
