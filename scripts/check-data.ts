import { buildSeed, TEAMS } from '../src/data/seed';
import { DRAW } from '../src/data/draw';
import { ROSTERS } from '../src/data/rosters';
import { GROUP_IDS } from '../src/data/config';

declare const process: { exit(code?: number): never };

const errors: string[] = [];
const expect = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };
const POSITIONS = ['حارس', 'مدافع', 'وسط', 'جناح', 'مهاجم'];

const state = buildSeed();
const nicknames = TEAMS.map((t) => t.nickname);

expect(TEAMS.length === 16, 'يجب أن يكون هناك 16 كلية');
expect(new Set(nicknames).size === 16, 'أسماء الكليات مكررة');
expect(new Set(TEAMS.map((t) => t.id)).size === 16, 'معرّفات الكليات مكررة');

// القرعة: إما فارغة بالكامل أو مكتملة وصحيحة
const drawn = GROUP_IDS.flatMap((g) => DRAW[g]);
if (drawn.length > 0) {
  for (const g of GROUP_IDS) expect(DRAW[g].length === 4, `المجموعة ${g} يجب أن تضم 4 كليات (فيها ${DRAW[g].length})`);
  expect(new Set(drawn).size === drawn.length, 'كلية مكررة في القرعة');
  for (const n of drawn) expect(nicknames.includes(n), `اسم كلية غير معروف في القرعة: "${n}"`);
  expect(drawn.length === 16, 'القرعة يجب أن تضم 16 كلية');
}

// التشكيلات
for (const [nick, list] of Object.entries(ROSTERS)) {
  expect(nicknames.includes(nick), `تشكيلة لكلية غير معروفة: "${nick}"`);
  const numbers = list.map((p) => p.number);
  expect(new Set(numbers).size === numbers.length, `رقم قميص مكرر في ${nick}`);
  for (const p of list) {
    expect(p.name.trim().length > 0, `لاعب بلا اسم في ${nick}`);
    expect(Number.isInteger(p.number) && p.number > 0 && p.number < 100, `رقم قميص غير صالح في ${nick}: ${p.number}`);
    expect(POSITIONS.includes(p.position), `مركز غير صالح في ${nick}: ${p.position}`);
  }
}

// الجدول
if (drawn.length === 16) {
  expect(state.matches.length === 24, `يجب توليد 24 مباراة (الحالي ${state.matches.length})`);
  for (const t of state.teams) {
    const n = state.matches.filter((m) => m.homeId === t.id || m.awayId === t.id).length;
    expect(n === 3, `${t.name} تلعب ${n} مباريات بدل 3`);
  }
} else {
  expect(state.matches.length === 0, 'يجب ألا توجد مباريات قبل اكتمال القرعة');
}
expect(state.events.length === 0, 'يجب ألا توجد أحداث في البيانات الأساسية');

if (errors.length) {
  console.error('❌ فشل فحص البيانات:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
const rosterCount = state.players.length;
console.log(
  `✅ البيانات سليمة: ${state.teams.length} كلية، ` +
    (drawn.length ? `القرعة مكتملة و${state.matches.length} مباراة` : 'بانتظار القرعة') +
    `، ${rosterCount} لاعب مسجّل.`,
);
