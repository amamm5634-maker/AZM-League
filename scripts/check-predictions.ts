/**
 * يختبر توقعات المباريات بدون واجهة: إغلاق التوقع بالموعد والحالة، النسب (مجموعها 100)،
 * وتحويل أخطاء الخادم لرسائل عربية. التشغيل: npm run check:predictions
 * (الدوال الحقيقية في predictions.sql تُجرَّب على Supabase نفسه).
 */
import { SupabaseRepository } from '../src/services/supabaseRepository';
import { LocalStorageRepository } from '../src/services/localRepository';
import { isPredictionClosed, predictionPercents, totalVotes } from '../src/lib/predictions';
import type { Match } from '../src/types';

declare const process: { exit(code?: number): never };

const errors: string[] = [];
const expect = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

const match = (over: Partial<Match> = {}): Match =>
  ({ id: 'm01', homeId: 't01', awayId: 't02', date: '2026-11-15', time: '16:00', status: 'scheduled', homeScore: 0, awayScore: 0, round: 1, group: 'A', ...over }) as Match;

type Rpc = { name: string; args: unknown };
function fakeDb(handler: (name: string, args: unknown) => { data?: unknown; error?: { message: string } | null }) {
  const calls: Rpc[] = [];
  return {
    calls,
    db: {
      rpc: async (name: string, args?: unknown) => {
        calls.push({ name, args });
        const r = handler(name, args);
        return { data: r.data ?? null, error: r.error ?? null };
      },
    },
  };
}

async function main() {
  // ---- الإغلاق: التوقيت ثابت UTC+2 مهما كان جهاز الزائر ----
  const kickoff = Date.parse('2026-11-15T16:00:00+02:00'); // = 14:00 UTC
  expect(!isPredictionClosed(match(), kickoff - 60_000), 'قبل الصافرة بدقيقة: مفتوح');
  expect(isPredictionClosed(match(), kickoff), 'عند الصافرة: مغلق');
  expect(isPredictionClosed(match(), kickoff + 3_600_000), 'بعد الصافرة: مغلق');
  expect(isPredictionClosed(match({ status: 'live' }), kickoff - 86_400_000), 'مباراة جارية: مغلق ولو قبل الموعد');
  expect(isPredictionClosed(match({ status: 'completed' }), 0), 'مباراة منتهية: مغلق');

  // ---- النسب ----
  const p1 = predictionPercents({ home: 1, draw: 1, away: 1 });
  expect(p1.home + p1.draw + p1.away === 100, `ثلاثة أثلاث يجب أن تجمع 100 لا ${p1.home + p1.draw + p1.away}`);
  const p2 = predictionPercents({ home: 7, draw: 2, away: 1 });
  expect(p2.home === 70 && p2.draw === 20 && p2.away === 10, 'نسب 7/2/1');
  const p3 = predictionPercents({ home: 2, draw: 2, away: 1 });
  expect(p3.home + p3.draw + p3.away === 100, 'نسب 2/2/1 مجموعها 100');
  const p0 = predictionPercents({ home: 0, draw: 0, away: 0 });
  expect(p0.home === 0 && p0.draw === 0 && p0.away === 0 && totalVotes(null) === 0, 'لا أصوات: أصفار');
  for (let i = 0; i < 300; i++) {
    const c = { home: Math.floor(Math.random() * 500), draw: Math.floor(Math.random() * 500), away: Math.floor(Math.random() * 500) };
    if (totalVotes(c) === 0) continue;
    const p = predictionPercents(c);
    if (p.home + p.draw + p.away !== 100) { errors.push(`مجموع النسب ≠ 100 لـ ${JSON.stringify(c)}`); break; }
  }

  // ---- المستودع: العدّ ----
  let f = fakeDb(() => ({ data: [{ choice: 'home', n: '5' }, { choice: 'away', n: 2 }, { choice: 'bogus', n: 9 }] }));
  let repo = new SupabaseRepository(f.db as never);
  const counts = await repo.loadPredictionCounts('m01');
  expect(counts.home === 5 && counts.draw === 0 && counts.away === 2, 'العدّ: تحويل الأرقام النصية وتجاهل الاختيارات المجهولة');
  expect(f.calls[0]?.name === 'prediction_counts' && JSON.stringify(f.calls[0].args) === JSON.stringify({ p_match: 'm01' }), 'استدعاء prediction_counts بالمعامل الصحيح');
  f = fakeDb(() => ({ error: { message: 'function public.prediction_counts does not exist' } }));
  repo = new SupabaseRepository(f.db as never);
  let threw = false;
  try { await repo.loadPredictionCounts('m01'); } catch { threw = true; }
  expect(threw, 'فشل العدّ يجب أن يرمي خطأ (ليخفي الواجهة القسم)');

  // ---- المستودع: التسجيل ----
  f = fakeDb(() => ({}));
  repo = new SupabaseRepository(f.db as never);
  let r = await repo.submitPrediction('m01', 'draw', 'device-12345');
  expect(r.ok && f.calls[0]?.name === 'submit_prediction' && JSON.stringify(f.calls[0].args) === JSON.stringify({ p_match: 'm01', p_choice: 'draw', p_device: 'device-12345' }), 'تسجيل ناجح بالمعاملات الصحيحة');

  const failWith = async (message: string) => {
    const x = fakeDb(() => ({ error: { message } }));
    return new SupabaseRepository(x.db as never).submitPrediction('m01', 'home', 'device-12345');
  };
  r = await failWith('already_voted');
  expect(r.ok && r.message.includes('سبق'), 'تصويت مكرر: ليس خطأ، رسالة "سبق أن سجّلت"');
  r = await failWith('closed');
  expect(!r.ok && r.error.includes('أُغلق'), 'مغلق: رسالة واضحة');
  r = await failWith('full');
  expect(!r.ok && r.error.includes('الحد الأقصى'), 'ممتلئ: رسالة واضحة');
  r = await failWith('connection reset');
  expect(!r.ok && r.error.includes('تعذّر'), 'خطأ مجهول: رسالة عامة بلا تسريب تفاصيل');
  expect(!(r.ok === false && r.error.includes('connection reset')), 'لا نُظهر نص خطأ قاعدة البيانات للزائر');

  // ---- المحلي (بدون Supabase) ----
  const local = new LocalStorageRepository();
  const lc = await local.loadPredictionCounts('m01');
  expect(lc.home === 0 && lc.draw === 0 && lc.away === 0, 'المحلي: أصفار');
  expect(!(await local.submitPrediction('m01', 'home', 'device-12345')).ok, 'المحلي: التسجيل يُرفض برسالة');

  if (errors.length) {
    console.error(`فشلت ${errors.length} فحوصات:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log('✓ توقعات المباريات: كل الفحوصات نجحت');
}

main().catch((e) => { console.error(e); process.exit(1); });
