import { buildSeed } from './demo-seed';
import { computePlayerStats, computeStandings } from '../src/lib/stats';
import { validateEventInput } from '../src/lib/validation';

declare const process: { exit(code?: number): never };

const state = buildSeed();
const errors: string[] = [];
const expect = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

expect(state.teams.length === 16, 'يجب أن يكون هناك 16 فريقاً');
for (const g of ['A', 'B', 'C', 'D']) {
  expect(state.teams.filter((t) => t.group === g).length === 4, `المجموعة ${g} ليست 4 فرق`);
}
expect(new Set(state.players.map((p) => p.id)).size === state.players.length, 'معرّفات اللاعبين مكررة');
expect(new Set(state.players.map((p) => p.name)).size === state.players.length, 'أسماء اللاعبين مكررة');
for (const t of state.teams) {
  const squad = state.players.filter((p) => p.teamId === t.id);
  expect(squad.length === 10, `تشكيلة ${t.name} ليست 10 لاعبين`);
  expect(new Set(squad.map((p) => p.number)).size === squad.length, `أرقام قمصان مكررة في ${t.name}`);
}
expect(state.matches.length === 24, 'يجب أن يكون هناك 24 مباراة');

for (const m of state.matches) {
  const goals = state.events.filter((e) => e.matchId === m.id);
  const home = goals.filter((e) => e.teamId === m.homeId).length;
  const away = goals.filter((e) => e.teamId === m.awayId).length;
  expect(home === m.homeScore && away === m.awayScore, `نتيجة ${m.id} لا تطابق أهدافها (${home}-${away} مقابل ${m.homeScore}-${m.awayScore})`);
}
for (const e of state.events) {
  const v = validateEventInput(state, e);
  expect(v.ok, `حدث غير صالح ${e.id}: ${v.ok ? '' : v.error}`);
}

const standings = computeStandings(state);
let gf = 0, ga = 0;
for (const rows of Object.values(standings)) {
  for (const r of rows) {
    gf += r.gf; ga += r.ga;
    expect(r.won + r.drawn + r.lost === r.played, `لاعب/فريق ${r.teamId}: مجموع النتائج لا يساوي المباريات`);
    expect(r.pts === r.won * 3 + r.drawn, `نقاط ${r.teamId} خاطئة`);
    expect(r.played === 2, `${r.teamId} لعب ${r.played} مباراة بدل 2`);
  }
}
expect(gf === ga, 'مجموع الأهداف له وعليه غير متساوٍ');
const totalGoals = state.matches.reduce((s, m) => s + m.homeScore + m.awayScore, 0);
expect(gf === totalGoals, 'مجموع الأهداف لا يطابق النتائج');
const stats = computePlayerStats(state);
expect(stats.reduce((s, x) => s + x.goals, 0) === totalGoals, 'أهداف اللاعبين لا تطابق الأهداف الكلية');

if (errors.length) {
  console.error('❌ فشل فحص البيانات:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✅ البيانات سليمة: ${state.teams.length} فريق، ${state.players.length} لاعب، ${state.matches.length} مباراة، ${state.events.length} هدف.`);
