import type { Match, TournamentState } from '../src/types';
import { computeStandings } from '../src/lib/stats';

declare const process: { exit(code?: number): never };

const errors: string[] = [];
const expect = (c: boolean, m: string) => { if (!c) errors.push(m); };

const teams = ['t1', 't2', 't3', 't4'].map((id, i) => ({ id, name: `فريق ${i + 1}`, nickname: id, short: id, color: '#000', group: 'A' as const }));
let n = 0;
const m = (home: string, away: string, hs: number, as: number): Match => ({ id: `m${++n}`, round: 1, group: 'A', homeId: home, awayId: away, date: '2026-11-15', time: '14:00', venue: '', status: 'completed', homeScore: hs, awayScore: as });
const mk = (matches: Match[], discipline?: Record<string, number>): TournamentState => ({ teams, players: [], matches, events: [], news: [], discipline });
const order = (s: TournamentState) => computeStandings(s).A.map((r) => r.teamId).join(',');

// 1) مثال اللائحة: فريقان متساويان في النقاط؛ تُقدَّم المواجهة المباشرة على فارق الأهداف العام
// t1 فاز على t2 بهدف، لكن t2 فاز على t3 بخمسة وخسر من t4 بهدف... t1 و t2 كلاهما 6 نقاط
{
  const s = mk([
    m('t1', 't2', 1, 0), // t1 يفوز على t2 مباشرة
    m('t2', 't3', 5, 0), // فارق t2 كبير
    m('t1', 't3', 1, 0),
    m('t4', 't1', 1, 0), // t1 يخسر من t4
    m('t2', 't4', 2, 1),
    m('t3', 't4', 0, 0),
  ]);
  const rows = Object.fromEntries(computeStandings(s).A.map((r) => [r.teamId, r]));
  expect(rows.t1.pts === 6 && rows.t2.pts === 6, 'يجب أن يتساوى t1 وt2 في 6 نقاط');
  expect(rows.t2.gd > rows.t1.gd, 'فارق أهداف t2 العام يجب أن يكون أفضل (لإثبات أن المواجهة هي الحاسمة)');
  expect(order(s).indexOf('t1') < order(s).indexOf('t2'), 'المواجهة المباشرة: t1 فاز على t2 فيتقدم عليه رغم فارق الأهداف');
}

// 2) تعادل ثلاثي دائري (كل واحد يفوز على الآخر): المواجهات المباشرة لا تفصل، فنذهب لفارق الأهداف العام
{
  const s = mk([
    m('t1', 't2', 1, 0),
    m('t2', 't3', 1, 0),
    m('t3', 't1', 3, 0), // t3 يفوز بفارق أكبر
    m('t1', 't4', 0, 1),
    m('t2', 't4', 0, 1),
    m('t3', 't4', 0, 1),
  ]);
  const rows = computeStandings(s).A;
  expect(rows[0].teamId === 't4', 't4 (9 نقاط) أولاً');
  const rest = rows.slice(1).map((r) => r.teamId);
  const gd = Object.fromEntries(rows.map((r) => [r.teamId, r.gd]));
  expect(gd[rest[0]] >= gd[rest[1]] && gd[rest[1]] >= gd[rest[2]], 'التعادل الدائري يُحسم بفارق الأهداف العام');
}

// 3) تعادل تام (نقاط ومواجهة وفارق أهداف): النقاط التأديبية، الأقل أفضل
{
  const base = [
    m('t1', 't2', 1, 1),
    m('t3', 't4', 0, 0),
    m('t1', 't3', 0, 0),
    m('t2', 't4', 0, 0),
    m('t1', 't4', 0, 0),
    m('t2', 't3', 0, 0),
  ];
  const a = order(mk(base, { t1: 5, t2: 1, t3: 2, t4: 9 }));
  const idx = (o: string, t: string) => o.split(',').indexOf(t);
  expect(idx(a, 't2') < idx(a, 't1'), 't2 (1 نقطة تأديبية) يتقدم على t1 (5 نقاط) عند التعادل التام');
  expect(idx(a, 't3') < idx(a, 't4'), 't3 يتقدم على t4 تأديبياً');
}

// 4) بدون أي مباراة منتهية: لا انهيار، والترتيب ثابت
expect(order(mk([])).split(',').length === 4, 'الترتيب بلا مباريات يجب أن يعمل');

if (errors.length) { console.error('❌\n' + errors.join('\n')); process.exit(1); }
console.log('✅ كسر التعادل حسب اللائحة: النقاط ← المواجهات المباشرة ← فارق الأهداف ← النقاط التأديبية.');
