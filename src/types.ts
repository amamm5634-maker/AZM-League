export type GroupId = 'A' | 'B' | 'C' | 'D';
export type Position = 'حارس' | 'مدافع' | 'وسط' | 'جناح' | 'مهاجم';
export type MatchStatus = 'scheduled' | 'live' | 'completed';

export interface Team {
  id: string;
  name: string; // اسم الكلية
  nickname: string; // لقب الفريق
  short: string; // حروف الشارة
  color: string;
  group?: GroupId; // تُحدد بعد القرعة
  logo?: string; // مسار شعار الكلية داخل public/ مثل logos/hendasa.png (اختياري)
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: Position;
  photo?: string; // مسار الصورة داخل public/ مثل players/ahmed.jpg
}

export interface Match {
  id: string;
  round: number; // 1..3
  group: GroupId;
  homeId: string;
  awayId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  venue: string;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  motmId?: string; // أفضل لاعب في المباراة
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: 'goal';
  teamId: string;
  scorerId: string;
  assistId?: string;
  minute?: number;
}

/** بطاقة (أصفر/أحمر) لاعب في مباراة، تُسجَّل مع الدقيقة */
export type CardKind = 'yellow' | 'red';
export interface MatchCard {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  kind: CardKind;
  minute?: number;
}
export interface CardInput {
  matchId: string;
  teamId: string;
  playerId: string;
  kind: CardKind;
  minute?: number;
}

/** تبديل: خرج لاعب ودخل بديل. من خرج لا يعود */
export interface MatchSub {
  id: string;
  matchId: string;
  teamId: string;
  outId: string;
  inId: string;
  minute?: number;
}
export interface SubInput {
  matchId: string;
  teamId: string;
  outId: string;
  inId: string;
  minute?: number;
}

/** التشكيلة الأساسية (11 لاعباً) لفريق في مباراة، يسجّلها مسجّل المباراة. الباقي من قائمة الفريق = البدلاء */
export interface Lineup {
  matchId: string;
  teamId: string;
  playerIds: string[]; // 11 معرّفاً من لاعبي الفريق نفسه
  updatedAt?: string; // ISO
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  tag: string;
  image?: string; // مسار صورة اختيارية داخل public/
}

export interface TournamentState {
  teams: Team[];
  players: Player[];
  matches: Match[];
  events: MatchEvent[];
  news: NewsItem[];
  /** التشكيلات المسجّلة للمباريات. اختياري: الغائب = لا تشكيلات بعد */
  lineups?: Lineup[];
  /** البطاقات المسجّلة. اختياري: الغائب = لا بطاقات */
  cards?: MatchCard[];
  /** التبديلات المسجّلة. اختياري: الغائب = لا تبديلات */
  subs?: MatchSub[];
  /** النقاط التأديبية لكل فريق (teamId ← نقاط؛ الأقل أفضل). تُستخدم في كسر التعادل بعد فارق الأهداف. اختياري: الغائب = 0 */
  discipline?: Record<string, number>;
}

export interface EventInput {
  matchId: string;
  teamId: string;
  scorerId: string;
  assistId?: string;
  minute?: number;
}

export interface StandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface PlayerStat {
  playerId: string;
  teamId: string;
  goals: number;
  assists: number;
}

/** صورة في معرض المصوّر (الملفان مضغوطان قبل الرفع: الأصلية للعرض الكامل ومصغّرة للشبكة) */
export interface GalleryPhoto {
  id: string;
  url: string; // الصورة الكاملة (مضغوطة)
  thumb: string; // مصغّرة للشبكة
  matchId?: string; // مباراة مرتبطة (اختياري)
  caption?: string;
  createdAt: string; // ISO
  width?: number;
  height?: number;
  /** رقم الجولة التي اختيرت هذه الصورة لها كـ«صورة الجولة» (1 إلى 3) */
  roundPick?: number;
}

/** رسالة جمهور في «مدرجات المباراة» */
export interface MatchMessage {
  id: string;
  matchId: string;
  author: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string; // ISO
}

/** اختيار التوقع: فوز صاحب الأرض، تعادل، أو فوز الضيف */
export type PredictionChoice = 'home' | 'draw' | 'away';
export type PredictionCounts = Record<PredictionChoice, number>;
