/**
 * يختبر منطق التشكيلات بدون واجهة: التحقق من الـ11، القفل عند البداية، أحدث تشكيلة، وبناء الخطة.
 * التشغيل: npm run check:lineup
 */
import { buildSeed } from '../src/data/seed';
import { FORMATIONS, LINEUP_SIZE, buildFormation, kickoffTime, latestLineup, lineupFor, lineupLock, validateLineup } from '../src/lib/lineup';
import type { Lineup } from '../src/types';
import { SupabaseRepository, lineupError } from '../src/services/supabaseRepository';

declare const process: { exit(code?: number): never };
const errors: string[] = [];
const expect = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

const base = buildSeed();
// القرعة لم تُدخَل بعد في draw.ts، فنركّب مباريات تجريبية لهذا الفحص فقط
const t = base.teams;
const mk = (id: string, i: number, j: number, date: string, time: string) => ({
  id, round: 1, group: 'A' as const, homeId: t[i].id, awayId: t[j].id, date, time, venue: 'x', status: 'scheduled' as const, homeScore: 0, awayScore: 0,
});
const s = { ...base, matches: [mk('m01', 8, 0, '2026-11-15', '16:00'), mk('m02', 8, 1, '2026-11-18', '16:00'), mk('m03', 8, 2, '2026-11-21', '17:30')] };
const cs = s.teams.find((t) => t.nickname === 'حاسوب')!;
const squad = s.players.filter((p) => p.teamId === cs.id);
expect(squad.length === 22, `قائمة حاسوب 22 لاعباً، الحالي ${squad.length}`);
expect(squad[0].id === `${cs.id}-p01`, 'معرّف اللاعب يعتمد على الترتيب لا رقم القميص');

// 4-4-2 تقريبي: حارس + 4 مدافعين + 4 وسط (واحد منهم ارتكاز) + جناحان + مهاجم
const pick = (pos: string, n: number) => squad.filter((p) => p.position === pos).slice(0, n).map((p) => p.id);
const good = [...pick('حارس', 1), ...pick('مدافع', 4), ...pick('وسط', 3), ...pick('جناح', 2), ...pick('مهاجم', 1)];
expect(good.length === LINEUP_SIZE, 'تجهيز الاختبار');
expect(validateLineup(squad, good) === null, 'تشكيلة سليمة يجب أن تُقبل');
expect(validateLineup(squad, good.slice(0, 10))?.includes('11') === true, 'أقل من 11 يُرفض');
expect(validateLineup(squad, [...good, squad[21].id])?.includes('11') === true, 'أكثر من 11 يُرفض');
expect(validateLineup(squad, [...good.slice(0, 10), good[0]])?.includes('مكرر') === true, 'التكرار يُرفض');
const noGk = [...pick('مدافع', 5), ...pick('وسط', 3), ...pick('جناح', 2), ...pick('مهاجم', 1)];
expect(validateLineup(squad, noGk)?.includes('حارس') === true, 'بلا حارس يُرفض');
const other = s.players.find((p) => p.teamId !== cs.id)!;
expect(validateLineup(squad, [...good.slice(0, 10), other.id])?.includes('ليس من قائمة') === true, 'لاعب من فريق آخر يُرفض');

// الخطة
const f = buildFormation(squad, good);
expect(f.label === '4-3-3', `الخطة المتوقعة 4-3-3، الحالي ${f.label}`);
expect(f.rows.flat().length === 11 && f.rows[f.rows.length - 1][0].position === 'حارس', 'الحارس في آخر صف');
expect(f.subs.length === 11, `البدلاء = الباقون (11)، الحالي ${f.subs.length}`);
expect(f.rows[0].length === 3 && f.rows[0][1].position === 'مهاجم', 'المهاجم بين الجناحين');

// القفل
const m = s.matches[0];
const ko = kickoffTime(m);
expect(Number.isFinite(ko), 'وقت البداية صالح');
expect(!lineupLock(m, ko - 3_600_000, false).locked, 'قبل ساعة: مفتوحة');
expect(lineupLock(m, ko, false).locked, 'عند البداية: مقفولة');
expect(lineupLock(m, ko + 1, false).locked, 'بعد البداية: مقفولة');
expect(!lineupLock(m, ko + 3_600_000, true).locked, 'الأدمن يعدّل دائماً');
expect(lineupLock({ ...m, status: 'live' }, ko - 1000, false).locked, 'مباراة جارية: مقفولة حتى قبل الموعد');
expect(lineupLock({ ...m, status: 'completed' }, ko - 1000, false).reason?.includes('أدمن') === true, 'رسالة القفل تذكر الأدمن');

// البحث
const a: Lineup = { matchId: s.matches[0].id, teamId: s.matches[0].homeId, playerIds: [] };
const later = s.matches[2];
const b: Lineup = { matchId: later.id, teamId: a.teamId, playerIds: [] };
const st = { ...s, lineups: [b, a] };
expect(lineupFor(st, a.matchId, a.teamId) === a, 'lineupFor');
expect(latestLineup(st, a.teamId)?.lineup === b, 'أحدث تشكيلة بحسب موعد المباراة');
expect(latestLineup(s, a.teamId) === undefined, 'بلا تشكيلات = لا شيء');

// ---- رسائل الأخطاء والاستدعاء (عميل Supabase مزيّف) ----
expect(lineupError({ message: 'locked', code: '55000' }).error.includes('مقفولة'), 'رسالة القفل');
expect(lineupError({ message: 'player_not_in_team' }).error.includes('11'), 'رسالة لاعب من فريق آخر');
expect(lineupError({ message: 'Could not find the function public.save_lineup', code: 'PGRST202' }).error.includes('lineups.sql'), 'رسالة: الدالة غير منشأة');
expect(lineupError({ message: 'not authorized', code: '42501' }).error.includes('صلاحية'), 'رسالة: بلا صلاحية');
const calls: { name: string; args: unknown }[] = [];
const fake = { rpc: async (name: string, args: unknown) => { calls.push({ name, args }); return { error: null }; } };
const repo = new SupabaseRepository(fake as never, () => ({ ...s }));
(repo as unknown as { load: () => Promise<unknown> }).load = async () => ({ ...s });
const res = await repo.saveLineup('m01', cs.id, good);
expect(res.ok, 'saveLineup ينجح مع عميل سليم');
expect(calls[0]?.name === 'save_lineup' && JSON.stringify(calls[0].args) === JSON.stringify({ p_match: 'm01', p_team: cs.id, p_players: good }), 'وسائط save_lineup');
const bad = new SupabaseRepository({ rpc: async () => ({ error: { message: 'locked', code: '55000' } }) } as never, () => s);
const r2 = await bad.saveLineup('m01', cs.id, good);
expect(!r2.ok && r2.error.includes('مقفولة'), 'saveLineup يرجع رسالة القفل');

// ---- طريقة اللعب المختارة ----
const gk1 = squad.find((p) => p.position === 'حارس')!;
const field10 = squad.filter((p) => p.position !== 'حارس').slice(0, 10).map((p) => p.id);
const xi = [gk1.id, ...field10];
for (const f of FORMATIONS) {
  const fo = buildFormation(squad, xi, undefined, f);
  const counts = fo.rows.map((r) => r.length);
  expect(fo.label === f, `طريقة ${f} تُطبَّق`);
  expect(counts[counts.length - 1] === 1 && counts.slice(0, -1).reverse().join('-') === f, `صفوف ${f} صحيحة (${counts.join('/')})`);
  expect(fo.rows.flat().length === 11, `${f}: 11 لاعباً بلا تكرار`);
}
const badF = buildFormation(squad, xi, undefined, '4-4-3');
expect(badF.label !== '4-4-3', 'طريقة غير معروفة تُتجاهل');
const twoGk = squad.filter((p) => p.position === 'حارس').slice(0, 2).map((p) => p.id);
const xi2 = [...twoGk, ...squad.filter((p) => p.position !== 'حارس').slice(0, 9).map((p) => p.id)];
expect(buildFormation(squad, xi2, undefined, '4-4-2').label !== '4-4-2', 'حارسان: تُتجاهل الطريقة ويعود التلقائي');
const resF = await repo.saveLineup('m01', cs.id, good, undefined, '4-3-3');
expect(resF.ok && (calls[calls.length - 1].args as Record<string, unknown>).p_formation === '4-3-3', 'saveLineup يرسل p_formation');
await repo.saveLineup('m01', cs.id, good, undefined, 'خطأ');
expect(!('p_formation' in (calls[calls.length - 1].args as object)), 'طريقة غير صالحة لا تُرسل');

if (errors.length) { console.error('❌ ' + errors.join('\n - ')); process.exit(1); }
console.log('✅ check-lineup: كل الفحوصات نجحت');
