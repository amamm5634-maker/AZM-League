import type { GroupId, Match, NewsItem, Player, Team, TournamentState } from '../types';
import { GROUP_IDS, SCHEDULE, TOURNAMENT } from './config';
import { DRAW } from './draw';
import { ROSTERS } from './rosters';

/**
 * ===== بيانات دوري عزم =====
 * الكليات الـ16 ثابتة هنا. القرعة في draw.ts، واللاعبون في rosters.ts، والأخبار أدناه.
 * الألوان مقترحة ويمكن تغييرها.
 */
const COLLEGES: { nickname: string; name: string; short: string; color: string; logo?: string }[] = [
  { nickname: 'هندسة', name: 'كلية الهندسة', short: 'هن', color: '#1d4ed8' },
  { nickname: 'جيولوجيا', name: 'كلية الجيولوجيا', short: 'جيو', color: '#92400e' },
  // فريق واحد من كليتين (المختبرات والتمريض). ترتيب هذه القائمة يحدد معرّفات الفرق t01..t16 فلا تغيّره بعد بدء الدوري
  { nickname: 'مختبرات وتمريض', name: 'فريق المختبرات والتمريض', short: 'مخت', color: '#0e7490' },
  { nickname: 'إنتاج حيواني', name: 'كلية الإنتاج الحيواني', short: 'إنت', color: '#65a30d' },
  { nickname: 'لغات', name: 'كلية اللغات', short: 'لغ', color: '#7c3aed' },
  { nickname: 'تربية', name: 'كلية التربية', short: 'ترب', color: '#15803d' },
  { nickname: 'قانون', name: 'كلية القانون', short: 'قان', color: '#1e293b' },
  { nickname: 'علوم إدارية', name: 'كلية العلوم الإدارية', short: 'إدا', color: '#b45309' },
  { nickname: 'حاسوب', name: 'كلية الحاسوب', short: 'حاس', color: '#0f766e', logo: 'logos/cs-team.png' },
  { nickname: 'الطب البيطري', name: 'كلية الطب البيطري', short: 'بيط', color: '#4d7c0f' },
  { nickname: 'صحة عامة', name: 'كلية الصحة العامة', short: 'صحة', color: '#0369a1' },
  { nickname: 'دراسات اجتماعية واقتصادية', name: 'كلية الدراسات الاجتماعية والاقتصادية', short: 'دجت', color: '#a16207' },
  { nickname: 'تنمية ريفية', name: 'كلية التنمية الريفية', short: 'ريف', color: '#166534' },
  { nickname: 'تطبيقية', name: 'الكلية التطبيقية', short: 'تطب', color: '#c2410c' },
  { nickname: 'طب', name: 'كلية الطب', short: 'طب', color: '#b91c1c' },
  { nickname: 'علوم إنسانية', name: 'كلية العلوم الإنسانية', short: 'إنس', color: '#6d28d9' },
];

export const NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: 'انطلاق دوري عزم بمشاركة 16 فريقاً من جامعة بحري',
    summary:
      'دوري عام يضم جميع كليات جامعة بحري دفعة 23/24، في 4 مجموعات تضم كل منها 4 كليات، وتلعب كل كلية 3 مباريات في دور المجموعات.',
    date: '2026-11-02',
    tag: 'إعلان',
    image: 'images/stadium-sunset.jpg',
  },
  {
    id: 'n2',
    title: 'القرعة يوم 7 نوفمبر بحضور ممثلي الكليات',
    summary: 'تُقام قرعة الدوري يوم 7/11 بحضور ممثلي جميع الكليات المشاركة، وتُعلن فيها تفاصيل الاشتراك ومستلزمات الدوري.',
    date: '2026-11-02',
    tag: 'القرعة',
    image: 'images/goal-night.jpg',
  },
  {
    id: 'n3',
    title: 'صافرة البداية يوم 15 نوفمبر',
    summary: 'تنطلق مباريات الدوري يوم 15/11، ويُحدَّد الميدان لاحقاً في أحد الملاعب القريبة من الجامعة.',
    date: '2026-11-02',
    tag: 'إعلان',
    image: 'images/pitch-line.jpg',
  },
];

function groupOf(nickname: string): GroupId | undefined {
  return GROUP_IDS.find((g) => DRAW[g].includes(nickname));
}

function buildTeams(): Team[] {
  return COLLEGES.map((c, i) => ({
    id: `t${String(i + 1).padStart(2, '0')}`,
    name: c.name,
    nickname: c.nickname,
    short: c.short,
    color: c.color,
    logo: c.logo,
    group: groupOf(c.nickname),
  }));
}

export const TEAMS: Team[] = buildTeams();

function buildPlayers(teams: Team[]): Player[] {
  const players: Player[] = [];
  for (const team of teams) {
    // المعرّف يعتمد على ترتيب اللاعب في القائمة لا على رقم القميص، فتغيير الأرقام لا يكسر الأهداف والتشكيلات المحفوظة.
    // لذلك أضف اللاعبين الجدد في آخر القائمة ولا تغيّر ترتيب الموجودين بعد بدء الدوري.
    (ROSTERS[team.nickname] ?? []).forEach((entry, i) => {
      players.push({
        id: `${team.id}-p${String(i + 1).padStart(2, '0')}`,
        teamId: team.id,
        name: entry.name,
        number: entry.number,
        position: entry.position,
        photo: entry.photo,
      });
    });
  }
  return players;
}

/** يولّد جدول دور المجموعات (24 مباراة) تلقائياً بعد اكتمال القرعة، وإلا يرجع قائمة فارغة */
function buildMatches(teams: Team[]): Match[] {
  const groups = GROUP_IDS.map((g) =>
    DRAW[g].map((nick) => teams.find((t) => t.nickname === nick)),
  );
  if (groups.some((list) => list.length !== 4 || list.some((t) => !t))) return [];

  const matches: Match[] = [];
  let counter = 1;
  for (let round = 1; round <= 3; round++) {
    let idx = 0;
    GROUP_IDS.forEach((g, gi) => {
      const [a, b, c, d] = groups[gi].map((t) => t!.id);
      const pairs: [string, string][] =
        round === 1 ? [[a, b], [c, d]] : round === 2 ? [[a, c], [d, b]] : [[a, d], [b, c]];
      for (const [home, away] of pairs) {
        matches.push({
          id: `m${String(counter++).padStart(2, '0')}`,
          round,
          group: g,
          homeId: home,
          awayId: away,
          date: SCHEDULE.roundDates[round][idx >> 1],
          time: SCHEDULE.times[idx % 2],
          venue: TOURNAMENT.venueShort,
          status: 'scheduled',
          homeScore: 0,
          awayScore: 0,
        });
        idx++;
      }
    });
  }
  return matches;
}

/** يبني الحالة الأساسية للموقع (قبل أي تعديلات من لوحة الإدارة) */
export function buildSeed(): TournamentState {
  const teams = buildTeams();
  return {
    teams,
    players: buildPlayers(teams),
    matches: buildMatches(teams),
    events: [],
    lineups: [],
    news: NEWS.map((n) => ({ ...n })),
  };
}
