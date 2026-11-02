import type { GroupId, TournamentState } from '../types';
import { GROUP_IDS, GROUP_LETTERS, KNOCKOUT_QF } from '../data/config';
import { computeStandings } from './stats';

export interface Slot {
  label: string; // مثل "أول المجموعة أ" أو "فائز ر1"
  teamId?: string;
  provisional: boolean; // true = المركز الحالي لم يُحسم بعد
}

export interface BracketMatch {
  id: string;
  home: Slot;
  away: Slot;
}

export interface Bracket {
  quarters: BracketMatch[];
  semis: BracketMatch[];
  final: BracketMatch;
  groupsDone: Record<GroupId, boolean>;
}

/** هل انتهت كل مباريات المجموعة؟ */
function groupDone(state: TournamentState, g: GroupId): boolean {
  const ms = state.matches.filter((m) => m.group === g);
  return ms.length > 0 && ms.every((m) => m.status === 'completed');
}

/**
 * يبني شجرة الإقصائيات من الترتيب الحالي. المقعد يصبح نهائياً (provisional=false) عند انتهاء مباريات مجموعته،
 * وقبل ذلك يعرض المتصدر/الثاني الحاليين بعلامة "مؤقت" إن كانت هناك مباريات منتهية في المجموعة.
 */
export function computeBracket(state: TournamentState): Bracket {
  const standings = computeStandings(state);
  const done = Object.fromEntries(GROUP_IDS.map((g) => [g, groupDone(state, g)])) as Record<GroupId, boolean>;

  const slot = (code: string): Slot => {
    const g = code[0] as GroupId;
    const rank = Number(code[1]);
    const label = `${rank === 1 ? 'أول' : 'ثاني'} المجموعة ${GROUP_LETTERS[g]}`;
    const row = standings[g]?.[rank - 1];
    const started = (standings[g] ?? []).some((r) => r.played > 0);
    if (!row || !started) return { label, provisional: true };
    return { label, teamId: row.teamId, provisional: !done[g] };
  };

  const quarters = KNOCKOUT_QF.map(([a, b], i) => ({ id: `qf${i + 1}`, home: slot(a), away: slot(b) }));
  const winner = (n: number): Slot => ({ label: `فائز ر${n}`, provisional: true });
  const semis: BracketMatch[] = [
    { id: 'sf1', home: winner(1), away: winner(2) },
    { id: 'sf2', home: winner(3), away: winner(4) },
  ];
  const final: BracketMatch = { id: 'final', home: { label: 'فائز نصف 1', provisional: true }, away: { label: 'فائز نصف 2', provisional: true } };
  return { quarters, semis, final, groupsDone: done };
}
