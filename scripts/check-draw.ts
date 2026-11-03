/** يحاكي يوم القرعة: يملأ DRAW ويتأكد أن الجدول والترتيب يتولدان صحيحاً */
import { DRAW } from '../src/data/draw';
import { ROSTERS } from '../src/data/rosters';
import { buildSeed } from '../src/data/seed';
import { computeStandings, isDrawn } from '../src/lib/stats';
import { pickLineup } from '../src/lib/lineup';

declare const process: { exit(code?: number): never };
const errors: string[] = [];
const expect = (c: boolean, m: string) => { if (!c) errors.push(m); };

DRAW.A = ['هندسة', 'طب', 'حاسوب', 'قانون'];
DRAW.B = ['تمريض', 'لغات', 'تربية', 'اقتصاد'];
DRAW.C = ['جيولوجيا', 'مختبرات', 'بيطرة', 'صحة عامة'];
DRAW.D = ['تنمية ريفية', 'تطبيقية', 'علوم إدارية', 'علوم إنسانية'];
ROSTERS['هندسة'] = [
  { name: 'حارس 1', number: 1, position: 'حارس' },
  { name: 'مهاجم 9', number: 9, position: 'مهاجم' },
  { name: 'مهاجم 11', number: 11, position: 'مهاجم' },
];

const s = buildSeed();
expect(isDrawn(s), 'يجب أن تكتمل القرعة');
expect(s.matches.length === 24, `24 مباراة متوقعة، الحالي ${s.matches.length}`);
for (const t of s.teams) {
  expect(s.matches.filter((m) => m.homeId === t.id || m.awayId === t.id).length === 3, `${t.name} لا تلعب 3 مباريات`);
}
const pairs = new Set(s.matches.map((m) => [m.homeId, m.awayId].sort().join('-')));
expect(pairs.size === 24, 'مواجهة مكررة');
const st = computeStandings(s);
expect(st.A.length === 4 && st.D.length === 4, 'جداول الترتيب ناقصة');
const eng = s.teams.find((t) => t.nickname === 'هندسة')!;
// نفحص فريق هندسة فقط (فيه 3 لاعبين مُدخلين هنا)؛ قوائم الكليات الحقيقية في rosters.ts لا تؤثر على الفحص
const engPlayers = s.players.filter((p) => p.teamId === eng.id);
expect(engPlayers.length === 3 && engPlayers[0].id === `${eng.id}-n1`, 'توليد اللاعبين غير صحيح');
const { rows, subs } = pickLineup(s.players.filter((p) => p.teamId === eng.id));
expect(rows.flat().filter(Boolean).length === 2 && subs.length === 1, 'اختيار التشكيلة غير صحيح');
expect(rows[3][0]?.name === 'حارس 1', 'الحارس يجب أن يكون في الخلف');

if (errors.length) { console.error('❌ ' + errors.join('\n - ')); process.exit(1); }
console.log('✅ محاكاة القرعة سليمة: 24 مباراة، كل كلية 3 مباريات، بلا تكرار، والتشكيلة تعمل.');
