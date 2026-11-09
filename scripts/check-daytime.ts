/**
 * يختبر حساب النهار والليل بتوقيت السودان (UTC+2) بغضّ النظر عن منطقة الجهاز.
 * التشغيل: npm run check:daytime
 */
import { isNight, leagueHour } from '../src/lib/daytime';

declare const process: { exit(code?: number): never };

const errors: string[] = [];
const expect = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };
const at = (iso: string) => Date.parse(iso);

// الحدود بتوقيت السودان (+02:00)
expect(!isNight(at('2026-11-10T17:59:00+02:00')), '17:59 نهار');
expect(isNight(at('2026-11-10T18:00:00+02:00')), '18:00 ليل');
expect(isNight(at('2026-11-10T23:30:00+02:00')), '23:30 ليل');
expect(isNight(at('2026-11-10T00:00:00+02:00')), 'منتصف الليل: ليل');
expect(isNight(at('2026-11-10T05:59:00+02:00')), '05:59 ليل');
expect(!isNight(at('2026-11-10T06:00:00+02:00')), '06:00 نهار');
expect(!isNight(at('2026-11-10T12:00:00+02:00')), 'الظهر نهار');

// نفس اللحظة تُكتب بمناطق مختلفة يجب أن تعطي النتيجة نفسها (أي لا تتأثر بمنطقة الزائر)
const tokyoSix = at('2026-11-10T23:00:00+09:00'); // = 14:00 UTC = 16:00 السودان → نهار
const nySix = at('2026-11-10T11:00:00-05:00'); //    = 16:00 UTC = 18:00 السودان → ليل
expect(leagueHour(tokyoSix) === 16 && !isNight(tokyoSix), 'لحظة بتوقيت طوكيو تُحسب بتوقيت السودان (نهار)');
expect(leagueHour(nySix) === 18 && isNight(nySix), 'لحظة بتوقيت نيويورك تُحسب بتوقيت السودان (ليل)');
// التفاف منتصف الليل: 22:30 UTC = 00:30 السودان
expect(leagueHour(at('2026-11-10T22:30:00Z')) === 0, 'التفاف الساعة بعد 22:00 UTC');

if (errors.length) {
  console.error(`فشلت ${errors.length} فحوصات:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('✓ النهار والليل بتوقيت السودان: كل الفحوصات نجحت');
