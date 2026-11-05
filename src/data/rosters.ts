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
  // كلية دراسات المجتمع والتنمية الريفية: كشف 22 لاعب (دفعة 023-024) الأسماء مؤكدة من صاحب الموقع، والمراكز وأرقام القمصان مؤقتة (تسلسلية) وتُعدَّل عند وصول الفعلية.
  'تنمية ريفية': [
    { name: 'أشرف عبد المجيد', number: 1, position: 'حارس' },
    { name: 'إبراهيم إسماعيل إبراهيم', number: 2, position: 'حارس' },
    { name: 'مهند هارون مصطفى', number: 3, position: 'مدافع' },
    { name: 'مؤيد عامر', number: 4, position: 'مدافع' },
    { name: 'أحمد محمد أحمد', number: 5, position: 'مدافع' },
    { name: 'محمد عبد الباقي', number: 6, position: 'مدافع' },
    { name: 'مروان عبد العزيز', number: 7, position: 'مدافع' },
    { name: 'محمد الفاتح دفع الله', number: 8, position: 'مدافع' },
    { name: 'محمد يحيى', number: 9, position: 'مدافع' },
    { name: 'أحمد الطيب', number: 10, position: 'وسط' },
    { name: 'مصطفى إبراهيم مصطفى', number: 11, position: 'وسط' },
    { name: 'سيف الدين', number: 12, position: 'وسط' },
    { name: 'أكرم إبراهيم', number: 13, position: 'وسط' },
    { name: 'مؤيد أمير', number: 14, position: 'وسط' },
    { name: 'عمر عوض', number: 15, position: 'وسط' },
    { name: 'أسامة عثمان', number: 16, position: 'جناح' },
    { name: 'حسن أبو بكر', number: 17, position: 'جناح' },
    { name: 'صابر عبد الرحيم', number: 18, position: 'جناح' },
    { name: 'أحمد المرضي', number: 19, position: 'جناح' },
    { name: 'إسماعيل أحمد', number: 20, position: 'جناح' },
    { name: 'مصدق محمد', number: 21, position: 'مهاجم' },
    { name: 'عبد الله بابكر', number: 22, position: 'مهاجم' },
  ],
  // كلية الإنتاج الحيواني: كشف 17 لاعب الأسماء مؤكدة من صاحب الموقع، والمراكز وأرقام القمصان مؤقتة (تسلسلية) وتُعدَّل عند وصول الفعلية.
  'إنتاج حيواني': [
    { name: 'محمد ياسر محمد', number: 1, position: 'حارس' },
    { name: 'البشاري آدم بخيت', number: 2, position: 'حارس' },
    { name: 'مصعب محمود عمر', number: 3, position: 'مدافع' },
    { name: 'أحمد حسن أحمد', number: 4, position: 'مدافع' },
    { name: 'وليد جعفر موسى', number: 5, position: 'مدافع' },
    { name: 'أحمد محمد نور', number: 6, position: 'مدافع' },
    { name: 'زين العابدين قريب الله', number: 7, position: 'مدافع' },
    { name: 'سعود', number: 8, position: 'وسط' },
    { name: 'نور الدين آدم محمد', number: 9, position: 'وسط' },
    { name: 'عمر محمد بخيت', number: 10, position: 'وسط' },
    { name: 'ياسر الهادي', number: 11, position: 'وسط' },
    { name: 'خالد علي', number: 12, position: 'وسط' },
    { name: 'محمد حبيب الله', number: 13, position: 'جناح' },
    { name: 'محمد أحمد', number: 14, position: 'جناح' },
    { name: 'عبد الرحمن أبو روعة', number: 15, position: 'جناح' },
    { name: 'حمدان', number: 16, position: 'مهاجم' },
    { name: 'عبد الله آدم', number: 17, position: 'مهاجم' },
  ],
};
