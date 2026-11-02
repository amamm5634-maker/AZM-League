import { buildSeed } from './demo-seed';
import { qualificationOutlook } from '../src/lib/scenarios';
import { computeStandings } from '../src/lib/stats';
import type { TournamentState } from '../src/types';

declare const process: { exit(code?: number): never };

const errors: string[] = [];
const expect = (c: boolean, m: string) => { if (!c) errors.push(m); };

// مولّد عشوائي ثابت
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const clone = (s: TournamentState): TournamentState => JSON.parse(JSON.stringify(s));

// 1) المجموعات المنتهية: بالضبط متأهلان ومُقصيان لكل مجموعة
const done = buildSeed();
for (const m of done.matches) if (m.status !== 'completed') { m.status = 'completed'; m.homeScore = 1; m.awayScore = 0; }
for (const g of ['A', 'B', 'C', 'D'] as const) {
  const kinds = done.teams.filter((t) => t.group === g).map((t) => qualificationOutlook(done, t.id)!.kind);
  expect(kinds.filter((k) => k === 'qualified').length === 2 && kinds.filter((k) => k === 'eliminated').length === 2, `المجموعة ${g}: يجب متأهلان ومُقصيان`);
}

// 2) محاكاة عشوائية: التوقع قبل النهاية لا يتناقض مع النتيجة النهائية الفعلية
const base = buildSeed(); // الجولتان 1 و2 منتهيتان والثالثة قادمة
for (let run = 0; run < 400; run++) {
  const s = clone(base);
  const before = new Map(s.teams.map((t) => [t.id, qualificationOutlook(s, t.id)!.kind]));
  // سيناريو الفوز: نكمّل المباريات المتبقية عشوائياً
  for (const m of s.matches) {
    if (m.status !== 'completed') { m.status = 'completed'; m.homeScore = Math.floor(rnd() * 4); m.awayScore = Math.floor(rnd() * 4); }
  }
  const table = computeStandings(s);
  for (const g of ['A', 'B', 'C', 'D'] as const) {
    table[g].forEach((row, i) => {
      const k = before.get(row.teamId);
      if (k === 'qualified') expect(i < 2, `ضُمن التأهل لكن الفريق ${row.teamId} انتهى ${i + 1}`);
      if (k === 'eliminated') expect(i >= 2, `أُقصي لكن الفريق ${row.teamId} انتهى ${i + 1}`);
    });
  }
}

// 3) "التأهل بيده": لو فاز في كل مبارياته المتبقية يتأهل دائماً مهما كانت نتائج غيره
for (let run = 0; run < 300; run++) {
  const s = clone(base);
  const target = s.teams[Math.floor(rnd() * s.teams.length)];
  const o = qualificationOutlook(s, target.id)!;
  for (const m of s.matches) {
    if (m.status === 'completed') continue;
    m.status = 'completed';
    const ours = m.homeId === target.id || m.awayId === target.id;
    if (ours) { m.homeScore = m.homeId === target.id ? 1 : 0; m.awayScore = m.homeId === target.id ? 0 : 1; }
    else { m.homeScore = Math.floor(rnd() * 4); m.awayScore = Math.floor(rnd() * 4); }
  }
  const rank = computeStandings(s)[target.group!].findIndex((r) => r.teamId === target.id);
  if (o.kind === 'control' || o.kind === 'qualified') expect(rank < 2, `kind=${o.kind} لكن الفريق ${target.id} انتهى ${rank + 1} رغم فوزه في كل مبارياته`);
}

// 4) قبل القرعة: لا شيء
const empty = buildSeed();
empty.teams.forEach((t) => { t.group = undefined; });
expect(qualificationOutlook(empty, empty.teams[0].id) === null, 'قبل القرعة يجب أن يرجع null');

if (errors.length) { console.error('❌\n' + [...new Set(errors)].slice(0, 10).join('\n')); process.exit(1); }
console.log('✅ سيناريوهات التأهل سليمة: نهائية، ومحاكاة 400 + 300 تشغيلاً بلا تناقض.');
