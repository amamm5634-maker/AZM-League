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
