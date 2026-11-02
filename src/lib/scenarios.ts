import type { Match, TournamentState } from '../types';
import { computeStandings, teamById } from './stats';

export type OutlookKind = 'qualified' | 'eliminated' | 'control' | 'hope' | 'waiting';

export interface Outlook {
  kind: OutlookKind;
  text: string;
}

type Outcome = 'H' | 'D' | 'A';
const OUTCOMES: Outcome[] = ['H', 'D', 'A'];

interface Scan {
  safe: boolean; // في كل الاحتمالات: على الأكثر فريق واحد آخر بنقاط مساوية أو أعلى (فيتأهل حتى لو خسر كل التعادلات)
  minAbove: number; // أقل عدد فرق تتفوق عليه بالنقاط في أفضل احتمال
}

/**
 * يفحص كل نتائج (فوز/تعادل/خسارة) المباريات المتبقية في المجموعة. التعادل في النقاط لا يُحسم هنا
 * (فارق الأهداف غير معروف مسبقاً)، لذلك "الضمان" يفترض خسارة كل تعادل في النقاط، و"الإقصاء" يفترض كسبه.
 */
function scan(base: Map<string, number>, remaining: Match[], me: string, forceOwnWin: boolean): Scan {
  let safe = true;
  let minAbove = Infinity;
  const pts = new Map(base);

  const walk = (i: number) => {
    if (i === remaining.length) {
      const mine = pts.get(me) ?? 0;
      let above = 0;
      let geq = 0;
      for (const [id, p] of pts) {
        if (id === me) continue;
        if (p > mine) above++;
        if (p >= mine) geq++;
      }
      if (geq > 1) safe = false;
      if (above < minAbove) minAbove = above;
      return;
    }
    const m = remaining[i];
    const own = m.homeId === me || m.awayId === me;
    const options = forceOwnWin && own ? [m.homeId === me ? 'H' : 'A'] : OUTCOMES;
    for (const o of options as Outcome[]) {
      const dh = o === 'H' ? 3 : o === 'D' ? 1 : 0;
      const da = o === 'A' ? 3 : o === 'D' ? 1 : 0;
      pts.set(m.homeId, (pts.get(m.homeId) ?? 0) + dh);
      pts.set(m.awayId, (pts.get(m.awayId) ?? 0) + da);
      walk(i + 1);
      pts.set(m.homeId, (pts.get(m.homeId) ?? 0) - dh);
      pts.set(m.awayId, (pts.get(m.awayId) ?? 0) - da);
    }
  };
  walk(0);
  return { safe, minAbove };
}

/** وضع الفريق في سباق التأهل (المركزان الأول والثاني من المجموعة) بجملة عربية جاهزة، أو null قبل القرعة */
export function qualificationOutlook(state: TournamentState, teamId: string): Outlook | null {
  const team = teamById(state, teamId);
  if (!team?.group) return null;
  const rows = computeStandings(state)[team.group];
  if (rows.length < 2) return null;

  const remaining = state.matches.filter((m) => m.group === team.group && m.status !== 'completed');
  if (remaining.length === 0) {
    const rank = rows.findIndex((r) => r.teamId === teamId) + 1;
    return rank > 0 && rank <= 2
      ? { kind: 'qualified', text: 'تأهلت إلى الدور المقبل.' }
      : { kind: 'eliminated', text: 'انتهى مشوارها في دور المجموعات.' };
  }

  const base = new Map(rows.map((r) => [r.teamId, r.pts]));
  const all = scan(base, remaining, teamId, false);
  if (all.safe) return { kind: 'qualified', text: 'ضمنت التأهل إلى الدور المقبل.' };
  if (all.minAbove >= 2) return { kind: 'eliminated', text: 'خرجت من سباق التأهل رياضياً.' };

  const own = remaining.filter((m) => m.homeId === teamId || m.awayId === teamId).length;
  if (own === 0) return { kind: 'waiting', text: 'أنهت مبارياتها وتنتظر نتائج بقية المجموعة.' };

  const win = scan(base, remaining, teamId, true);
  const what = own === 1 ? 'مباراتها المتبقية' : `مبارياتها الـ${own} المتبقية`;
  if (win.safe) return { kind: 'control', text: `التأهل بيدها: الفوز في ${what} يضمنه.` };
  return { kind: 'hope', text: `تحتاج الفوز في ${what} وانتظار نتائج الفرق الأخرى، وقد يحسمها فارق الأهداف.` };
}
