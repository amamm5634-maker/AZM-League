import { buildSeed } from './demo-seed';
import { computeBracket } from '../src/lib/bracket';

declare const process: { exit(code?: number): never };

const errors: string[] = [];

/** يُكمل كل المباريات غير المنتهية بنتيجة 1-0 للمضيف */
function completeAll(state: ReturnType<typeof buildSeed>) {
  for (const m of state.matches) {
    if (m.status !== 'completed') { m.status = 'completed'; m.homeScore = 1; m.awayScore = 0; }
  }
}
const expect = (c: boolean, m: string) => { if (!c) errors.push(m); };

// 1) بيانات تجريبية مكتملة: 8 فرق مختلفة ونهائية
const state = buildSeed();
completeAll(state);
const b = computeBracket(state);
const ids = b.quarters.flatMap((m) => [m.home.teamId, m.away.teamId]);
expect(b.quarters.length === 4 && b.semis.length === 2, 'عدد المباريات الإقصائية غير صحيح');
expect(ids.every(Boolean), 'يوجد مقعد فارغ رغم اكتمال المجموعات');
expect(new Set(ids).size === 8, 'يجب أن تكون 8 فرق مختلفة');
expect(b.quarters.every((m) => !m.home.provisional && !m.away.provisional), 'المقاعد يجب أن تكون نهائية');

// 2) مجموعة واحدة غير مكتملة: مقاعدها مؤقتة
const s2 = buildSeed();
completeAll(s2);
const firstA = s2.matches.find((m) => m.group === 'A')!;
firstA.status = 'scheduled'; firstA.homeScore = 0; firstA.awayScore = 0;
const b2 = computeBracket(s2);
expect(b2.groupsDone.A === false && b2.groupsDone.B === true, 'حالة اكتمال المجموعات خاطئة');
expect(b2.quarters[0].home.provisional === true, 'مقعد المجموعة أ يجب أن يكون مؤقتاً');

// 3) بلا أي نتائج: مقاعد فارغة
const s3 = buildSeed();
for (const m of s3.matches) { m.status = 'scheduled'; m.homeScore = 0; m.awayScore = 0; }
expect(computeBracket(s3).quarters.every((m) => !m.home.teamId && !m.away.teamId), 'بدون نتائج يجب أن تكون المقاعد فارغة');

if (errors.length) { console.error('❌\n' + errors.join('\n')); process.exit(1); }
console.log('✅ شجرة الأدوار الإقصائية سليمة: 8 متأهلين، مؤقت/نهائي، وحالة بلا نتائج.');
