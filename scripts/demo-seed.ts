import type {
  GroupId,
  Match,
  MatchEvent,
  NewsItem,
  Player,
  Position,
  Team,
  TournamentState,
} from '../src/types';

/**
 * ===== البيانات التجريبية المركزية =====
 * كل الأسماء خيالية. الفرق والمباريات والأهداف تُولَّد هنا بشكل ثابت (deterministic)
 * فتكون النتائج متسقة مع الأهداف المسجلة دائماً.
 * لاستبدالها بالبيانات الرسمية: عدّل TEAMS و SCORES و NEWS أو اربط المستودع بـ Supabase.
 */

export const TEAMS: Team[] = [
  { id: 't01', name: 'كلية الهندسة', nickname: 'الصقور', short: 'هن', color: '#1d4ed8', group: 'A' },
  { id: 't02', name: 'كلية الطب', nickname: 'النسور', short: 'طب', color: '#b91c1c', group: 'A' },
  { id: 't03', name: 'كلية علوم الحاسوب', nickname: 'المبرمجون', short: 'حس', color: '#0f766e', group: 'A' },
  { id: 't04', name: 'كلية الاقتصاد', nickname: 'الأسود', short: 'قص', color: '#b45309', group: 'A' },
  { id: 't05', name: 'كلية القانون', nickname: 'الفرسان', short: 'قن', color: '#6d28d9', group: 'B' },
  { id: 't06', name: 'كلية الصيدلة', nickname: 'الفهود', short: 'صي', color: '#047857', group: 'B' },
  { id: 't07', name: 'كلية الآداب', nickname: 'النمور', short: 'أد', color: '#c2410c', group: 'B' },
  { id: 't08', name: 'كلية العلوم', nickname: 'الذئاب', short: 'عل', color: '#475569', group: 'B' },
  { id: 't09', name: 'كلية التربية', nickname: 'العقبان', short: 'تر', color: '#a16207', group: 'C' },
  { id: 't10', name: 'كلية الزراعة', nickname: 'الخيول', short: 'زر', color: '#4d7c0f', group: 'C' },
  { id: 't11', name: 'كلية الإعلام', nickname: 'البرق', short: 'إع', color: '#be185d', group: 'C' },
  { id: 't12', name: 'كلية العمارة', nickname: 'الجوارح', short: 'عم', color: '#0e7490', group: 'C' },
  { id: 't13', name: 'كلية طب الأسنان', nickname: 'الدلافين', short: 'أس', color: '#0369a1', group: 'D' },
  { id: 't14', name: 'كلية التمريض', nickname: 'الشهب', short: 'تم', color: '#9d174d', group: 'D' },
  { id: 't15', name: 'كلية الشريعة', nickname: 'الأبطال', short: 'شر', color: '#15803d', group: 'D' },
  { id: 't16', name: 'كلية الفنون', nickname: 'الصواعق', short: 'فن', color: '#7c3aed', group: 'D' },
];

/** نتائج الجولتين الأولى والثانية: المفتاح = المجموعة + الجولة + رقم المباراة في الجولة */
const SCORES: Record<string, [number, number]> = {
  A1a: [2, 1], A1b: [0, 0], A2a: [3, 1], A2b: [1, 1],
  B1a: [1, 0], B1b: [2, 2], B2a: [0, 1], B2b: [2, 1],
  C1a: [4, 1], C1b: [1, 2], C2a: [2, 0], C2b: [1, 1],
  D1a: [2, 0], D1b: [3, 2], D2a: [1, 1], D2b: [0, 1],
};

export const NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: 'كلية الهندسة تفتتح الدوري بفوز مثير على كلية الطب',
    summary: 'انتهت المباراة الافتتاحية 2-1 في لقاء حماسي حسمته الصقور في الشوط الثاني أمام جمهور كبير.',
    date: '2026-11-15',
    tag: 'نتائج',
  },
  {
    id: 'n2',
    title: 'كلية التربية تسجّل أكبر نتيجة في الجولة الأولى',
    summary: 'العقبان يكتسحون الخيول 4-1 ويتصدرون المجموعة الثالثة مؤقتاً بعد الجولة الأولى.',
    date: '2026-11-16',
    tag: 'نتائج',
  },
  {
    id: 'n3',
    title: 'تعادل مثير بين الآداب والعلوم في المجموعة الثانية',
    summary: 'لقاء مفتوح انتهى بالتعادل 2-2 بعد أن تبادل الفريقان التقدم أكثر من مرة.',
    date: '2026-11-16',
    tag: 'تقرير',
  },
  {
    id: 'n4',
    title: 'اللجنة المنظمة تعلن مواعيد الجولة الثالثة',
    summary: 'تقام مباريات الجولة الأخيرة من دور المجموعات يومي 22 و23 نوفمبر على الملعبين الرئيسي والفرعي.',
    date: '2026-11-20',
    tag: 'إعلان',
  },
  {
    id: 'n5',
    title: 'تنبيه للفرق: تسليم قوائم اللاعبين قبل ساعة من كل مباراة',
    summary: 'تذكّر اللجنة المنظمة الفرق بضرورة تسليم القوائم الرسمية ومطابقة أرقام القمصان.',
    date: '2026-11-21',
    tag: 'إعلان',
  },
];

// ---------- مولّد عشوائي ثابت (نفس الناتج في كل مرة) ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'أحمد', 'محمد', 'عمر', 'خالد', 'يوسف', 'إبراهيم', 'علي', 'حسن', 'حسين', 'طارق',
  'ماجد', 'سالم', 'فيصل', 'نادر', 'زياد', 'بلال', 'وليد', 'هاني', 'رامز', 'سامر',
  'كريم', 'ياسر', 'مصعب', 'إسماعيل', 'عادل', 'صلاح', 'جمال', 'معاذ', 'أنس', 'باسل',
  'فارس', 'مازن', 'لؤي', 'تامر', 'رائد', 'شادي', 'نبيل', 'هشام', 'عماد', 'أيمن',
];
const FAMILY_NAMES = [
  'الحاج', 'عبدالله', 'الطيب', 'إدريس', 'موسى', 'آدم', 'سليمان', 'بشير', 'الأمين', 'عثمان',
  'حمد', 'صالح', 'نور', 'فضل', 'جابر', 'عوض', 'كرار', 'مختار', 'عيسى', 'هارون',
  'يعقوب', 'زكريا', 'مبارك', 'التجاني', 'الفاتح', 'بابكر', 'سعيد', 'رحمة', 'خليفة', 'عابدين',
  'التوم', 'حامد', 'ناصر', 'جلال', 'العبيد', 'شريف', 'مأمون', 'الزين', 'دفع الله', 'القدال',
];

const SLOTS: { position: Position; number: number }[] = [
  { position: 'حارس', number: 1 },
  { position: 'مدافع', number: 2 },
  { position: 'مدافع', number: 3 },
  { position: 'مدافع', number: 4 },
  { position: 'وسط', number: 6 },
  { position: 'وسط', number: 8 },
  { position: 'وسط', number: 10 },
  { position: 'جناح', number: 7 },
  { position: 'مهاجم', number: 9 },
  { position: 'مهاجم', number: 11 },
];

function buildPlayers(): Player[] {
  const used = new Set<string>();
  const players: Player[] = [];
  TEAMS.forEach((team, ti) => {
    SLOTS.forEach((slot, k) => {
      const first = FIRST_NAMES[(ti * 3 + k * 7) % FIRST_NAMES.length];
      let fi = (ti * 11 + k * 13 + Math.floor(ti / 2)) % FAMILY_NAMES.length;
      let name = `${first} ${FAMILY_NAMES[fi]}`;
      while (used.has(name)) {
        fi = (fi + 1) % FAMILY_NAMES.length;
        name = `${first} ${FAMILY_NAMES[fi]}`;
      }
      used.add(name);
      players.push({
        id: `${team.id}-p${String(k + 1).padStart(2, '0')}`,
        teamId: team.id,
        name,
        number: slot.number,
        position: slot.position,
      });
    });
  });
  return players;
}

const GROUPS: GroupId[] = ['A', 'B', 'C', 'D'];
const ROUND_DAYS: Record<number, [string, string]> = {
  1: ['2026-11-15', '2026-11-16'],
  2: ['2026-11-18', '2026-11-19'],
  3: ['2026-11-22', '2026-11-23'],
};
const TIMES = ['14:00', '16:00', '18:00', '20:00'];
const MAIN_VENUE = 'ملعب الجامعة الرئيسي';
const SIDE_VENUE = 'الملعب الفرعي';

function buildMatches(): Match[] {
  const matches: Match[] = [];
  let counter = 1;
  for (let round = 1; round <= 3; round++) {
    let idx = 0;
    for (const g of GROUPS) {
      const ids = TEAMS.filter((t) => t.group === g).map((t) => t.id);
      const [a, b, c, d] = ids;
      const pairs: [string, string][] =
        round === 1 ? [[a, b], [c, d]] : round === 2 ? [[a, c], [d, b]] : [[a, d], [b, c]];
      pairs.forEach(([home, away], n) => {
        const key = `${g}${round}${n === 0 ? 'a' : 'b'}`;
        const score = SCORES[key];
        matches.push({
          id: `m${String(counter++).padStart(2, '0')}`,
          round,
          group: g,
          homeId: home,
          awayId: away,
          date: ROUND_DAYS[round][idx >> 2],
          time: TIMES[idx % 4],
          venue: idx % 2 === 0 ? MAIN_VENUE : SIDE_VENUE,
          status: score ? 'completed' : 'scheduled',
          homeScore: score ? score[0] : 0,
          awayScore: score ? score[1] : 0,
        });
        idx++;
      });
    }
  }
  return matches;
}

function pickWeighted<T>(items: T[], weights: number[], rand: () => number): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

const SCORER_W: Record<Position, number> = { مهاجم: 5, جناح: 3, وسط: 2, مدافع: 0.5, حارس: 0 };
const ASSIST_W: Record<Position, number> = { وسط: 4, جناح: 4, مهاجم: 2, مدافع: 1, حارس: 0 };

function buildEvents(matches: Match[], players: Player[]): MatchEvent[] {
  const rand = mulberry32(2026);
  const events: MatchEvent[] = [];
  let counter = 1;
  for (const m of matches) {
    if (m.status !== 'completed') continue;
    const goals: string[] = [
      ...Array<string>(m.homeScore).fill(m.homeId),
      ...Array<string>(m.awayScore).fill(m.awayId),
    ];
    // خلط الأهداف وتوزيع دقائق مختلفة مرتبة
    for (let i = goals.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [goals[i], goals[j]] = [goals[j], goals[i]];
    }
    const minutes = new Set<number>();
    while (minutes.size < goals.length) minutes.add(2 + Math.floor(rand() * 88));
    const sorted = [...minutes].sort((x, y) => x - y);

    goals.forEach((teamId, i) => {
      const squad = players.filter((p) => p.teamId === teamId);
      const scorer = pickWeighted(squad, squad.map((p) => SCORER_W[p.position]), rand);
      let assistId: string | undefined;
      if (rand() < 0.7) {
        const pool = squad.filter((p) => p.id !== scorer.id);
        assistId = pickWeighted(pool, pool.map((p) => ASSIST_W[p.position]), rand).id;
      }
      events.push({
        id: `ev${String(counter++).padStart(3, '0')}`,
        matchId: m.id,
        type: 'goal',
        teamId,
        scorerId: scorer.id,
        assistId,
        minute: sorted[i],
      });
    });
  }
  return events;
}

/** يبني نسخة جديدة من البيانات التجريبية الكاملة */
export function buildSeed(): TournamentState {
  const players = buildPlayers();
  const matches = buildMatches();
  return {
    teams: TEAMS.map((t) => ({ ...t })),
    players,
    matches,
    events: buildEvents(matches, players),
    news: NEWS.map((n) => ({ ...n })),
  };
}
