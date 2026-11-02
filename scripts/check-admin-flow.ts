/**
 * يختبر منطق لوحة الإدارة (بدون واجهة): التسجيل، التحقق، التعديل، الحذف،
 * إنهاء المباراة، إعادة الضبط، والحفظ في localStorage (محاكى هنا).
 * التشغيل: npm run check:flow
 */
export {};

declare const process: { exit(code?: number): never };

const memory = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  },
};

async function main() {
  const { LocalStorageRepository, STORAGE_KEY } = await import('../src/services/localRepository');
  const { buildSeed } = await import('./demo-seed');
  const { computePlayerStats, computeStandings, sortedScorers } = await import('../src/lib/stats');

  const errors: string[] = [];
  const expect = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

  const repo = new LocalStorageRepository(buildSeed);
  let state = await repo.load();
  const match = state.matches.find((m) => m.status === 'scheduled')!;
  const homeSquad = state.players.filter((p) => p.teamId === match.homeId);
  const awaySquad = state.players.filter((p) => p.teamId === match.awayId);
  const [h1, h2] = homeSquad;
  const [a1, a2] = awaySquad;

  // --- التحقق ---
  let r = await repo.addEvent({ matchId: match.id, teamId: match.homeId, scorerId: a1.id });
  expect(!r.ok, 'يجب رفض مسجّل من الفريق الآخر');
  r = await repo.addEvent({ matchId: match.id, teamId: match.homeId, scorerId: h1.id, assistId: h1.id });
  expect(!r.ok, 'يجب رفض صانع هدف = المسجّل');
  r = await repo.addEvent({ matchId: match.id, teamId: match.homeId, scorerId: h1.id, assistId: a1.id });
  expect(!r.ok, 'يجب رفض صانع هدف من الفريق الآخر');
  r = await repo.addEvent({ matchId: match.id, teamId: match.homeId, scorerId: h1.id, minute: 0 });
  expect(!r.ok, 'يجب رفض دقيقة 0');
  r = await repo.addEvent({ matchId: match.id, teamId: 't99', scorerId: h1.id });
  expect(!r.ok, 'يجب رفض فريق ليس طرفاً في المباراة');
  r = await repo.addEvent({ matchId: match.id, teamId: match.homeId, scorerId: '' });
  expect(!r.ok, 'يجب رفض مسجّل فارغ');
  state = await repo.load();
  expect(state.events.length === 40, 'الحالات المرفوضة يجب ألا تغيّر البيانات');

  // --- إضافة هدفين ---
  r = await repo.addEvent({ matchId: match.id, teamId: match.homeId, scorerId: h1.id, assistId: h2.id, minute: 12 });
  expect(r.ok, 'إضافة هدف صحيح فشلت');
  r = await repo.addEvent({ matchId: match.id, teamId: match.awayId, scorerId: a1.id, minute: 55 });
  expect(r.ok, 'إضافة هدف الضيف فشلت');
  state = await repo.load();
  let m = state.matches.find((x) => x.id === match.id)!;
  expect(m.homeScore === 1 && m.awayScore === 1, `النتيجة بعد هدفين يجب 1-1 لكنها ${m.homeScore}-${m.awayScore}`);
  expect(m.status === 'live', 'الحالة يجب أن تصبح جارية');
  let stats = computePlayerStats(state);
  expect(stats.find((s) => s.playerId === h1.id)?.goals === 1, 'أهداف المسجّل لم تتحدث');
  expect(stats.find((s) => s.playerId === h2.id)?.assists === 1, 'صناعة الهدف لم تتحدث');
  expect(sortedScorers(stats).length > 0, 'قائمة الهدافين فارغة');

  // --- تعديل: نقل الهدف الأول للضيوف ---
  const first = state.events.find((e) => e.matchId === match.id && e.scorerId === h1.id)!;
  r = await repo.updateEvent(first.id, { matchId: match.id, teamId: match.awayId, scorerId: a2.id, minute: 20 });
  expect(r.ok, 'تعديل الهدف فشل');
  state = await repo.load();
  m = state.matches.find((x) => x.id === match.id)!;
  expect(m.homeScore === 0 && m.awayScore === 2, `بعد النقل يجب 0-2 لكنها ${m.homeScore}-${m.awayScore}`);
  stats = computePlayerStats(state);
  expect(!stats.find((s) => s.playerId === h2.id), 'صناعة الهدف المعدّل يجب أن تُزال');
  r = await repo.updateEvent('nope', { matchId: match.id, teamId: match.homeId, scorerId: h1.id });
  expect(!r.ok, 'تعديل حدث غير موجود يجب أن يفشل');

  // --- حذف ---
  r = await repo.deleteEvent(first.id);
  expect(r.ok, 'حذف الهدف فشل');
  state = await repo.load();
  m = state.matches.find((x) => x.id === match.id)!;
  expect(m.homeScore === 0 && m.awayScore === 1, `بعد الحذف يجب 0-1 لكنها ${m.homeScore}-${m.awayScore}`);

  // --- نتيجة يدوية ---
  r = await repo.setScore(match.id, 2, 3);
  expect(r.ok, 'حفظ النتيجة اليدوية فشل');
  r = await repo.setScore(match.id, -1, 0);
  expect(!r.ok, 'يجب رفض نتيجة سالبة');
  r = await repo.setScore(match.id, 1.5, 0);
  expect(!r.ok, 'يجب رفض نتيجة غير صحيحة');
  r = await repo.setScore(match.id, 0, 1);
  expect(r.ok, 'إعادة النتيجة إلى 0-1 فشلت');

  // --- إنهاء المباراة وتحديث الترتيب ---
  const before = computeStandings(state)[match.group].find((x) => x.teamId === match.awayId)!;
  r = await repo.completeMatch(match.id);
  expect(r.ok, 'إنهاء المباراة فشل');
  state = await repo.load();
  const after = computeStandings(state)[match.group].find((x) => x.teamId === match.awayId)!;
  expect(after.played === before.played + 1 && after.pts === before.pts + 3, 'الترتيب لم يتحدث بعد إنهاء المباراة');
  r = await repo.completeMatch(match.id);
  expect(!r.ok, 'إنهاء مباراة منتهية يجب أن يُرفض');

  // --- الحفظ بعد "تحديث الصفحة" (نسخة جديدة من المستودع) ---
  const reloaded = await new LocalStorageRepository(buildSeed).load();
  expect(reloaded.matches.find((x) => x.id === match.id)?.status === 'completed', 'التعديلات لم تُحفظ في localStorage');

  // --- إعادة الضبط ---
  r = await repo.reset();
  expect(r.ok, 'إعادة الضبط فشلت');
  state = await repo.load();
  expect(state.events.length === 40, 'إعادة الضبط لم تعد الأهداف الأصلية');
  expect(state.matches.find((x) => x.id === match.id)?.status === 'scheduled', 'إعادة الضبط لم تعد حالة المباراة');

  // --- بيانات تالفة في التخزين ---
  memory.set(STORAGE_KEY, '{broken');
  const fallback = await new LocalStorageRepository(buildSeed).load();
  expect(fallback.teams.length === 16, 'يجب الرجوع للبيانات التجريبية عند تلف التخزين');

  if (errors.length) {
    console.error('❌ فشل اختبار لوحة الإدارة:\n' + errors.map((e) => ' - ' + e).join('\n'));
    process.exit(1);
  }
  console.log('✅ منطق لوحة الإدارة سليم: التحقق، الإضافة، التعديل، الحذف، النتيجة، الإنهاء، الحفظ، الإعادة.');
}

main();
