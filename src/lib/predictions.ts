import type { Match, PredictionChoice, PredictionCounts } from '../types';

/** توقيت الدوري: السودان UTC+2 ثابتاً (لا توقيت صيفي). نحسب موعد الصافرة به حتى لا يختلف الإغلاق باختلاف جهاز الزائر. */
const LEAGUE_UTC_OFFSET = '+02:00';

/** التوقع مغلق إن بدأت المباراة (الحالة) أو حان موعدها. الخادم يتحقق من الحالة فقط، والموعد حماية إضافية في الواجهة. */
export function isPredictionClosed(match: Match, now: number = Date.now()): boolean {
  if (match.status !== 'scheduled') return true;
  const at = new Date(`${match.date}T${match.time || '00:00'}:00${LEAGUE_UTC_OFFSET}`).getTime();
  return Number.isFinite(at) && now >= at;
}

/** نسب مئوية مجموعها 100 بالضبط (طريقة أكبر باقٍ) بدل التقريب الذي قد يعطي 99% أو 101% */
export function predictionPercents(counts: PredictionCounts | null): Record<PredictionChoice, number> {
  const keys: PredictionChoice[] = ['home', 'draw', 'away'];
  const out: Record<PredictionChoice, number> = { home: 0, draw: 0, away: 0 };
  const total = counts ? counts.home + counts.draw + counts.away : 0;
  if (!counts || total <= 0) return out;
  const exact = keys.map((k) => (counts[k] / total) * 100);
  keys.forEach((k, i) => (out[k] = Math.floor(exact[i])));
  let left = 100 - keys.reduce((s, k) => s + out[k], 0);
  const order = keys.map((k, i) => ({ k, rem: exact[i] - Math.floor(exact[i]) })).sort((a, b) => b.rem - a.rem);
  for (let i = 0; left > 0; i = (i + 1) % order.length, left--) out[order[i].k]++;
  return out;
}

export function totalVotes(counts: PredictionCounts | null): number {
  return counts ? counts.home + counts.draw + counts.away : 0;
}
