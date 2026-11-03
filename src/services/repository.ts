import type { EventInput, GalleryPhoto, MatchMessage, PredictionChoice, PredictionCounts, TournamentState } from '../types';

export type Result<T = void> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: string };

export interface NewsInput {
  title: string;
  summary: string;
  tag: string;
  image?: File;
}

/** صورة جاهزة للرفع: تُضغط في المتصفح (lib/image.ts) قبل وصولها هنا */
export interface PhotoInput {
  file: Blob; // الصورة الكاملة المضغوطة
  thumb: Blob; // المصغّرة
  width: number;
  height: number;
  matchId?: string;
  caption?: string;
}

export interface PhotoQuery {
  matchId?: string;
  limit?: number; // الافتراضي 24
  offset?: number;
}

export interface PhotoPage {
  photos: GalleryPhoto[];
  hasMore: boolean;
}

export interface PhotoUsage {
  count: number;
  bytes: number;
}

/**
 * واجهة الوصول للبيانات. الواجهة (UI) تتعامل مع هذه الواجهة فقط،
 * وهناك تطبيقان: LocalStorageRepository (تجريبي) و SupabaseRepository (حي).
 */
export interface TournamentRepository {
  readonly kind: 'local' | 'supabase';
  load(): Promise<TournamentState>;
  addEvent(input: EventInput): Promise<Result<TournamentState>>;
  updateEvent(eventId: string, input: EventInput): Promise<Result<TournamentState>>;
  deleteEvent(eventId: string): Promise<Result<TournamentState>>;
  setScore(matchId: string, home: number, away: number): Promise<Result<TournamentState>>;
  completeMatch(matchId: string): Promise<Result<TournamentState>>;
  setManOfMatch(matchId: string, playerId: string | null): Promise<Result<TournamentState>>;
  reset(): Promise<Result<TournamentState>>;
  addNews(input: NewsInput): Promise<Result<TournamentState>>;
  deleteNews(id: string): Promise<Result<TournamentState>>;

  // ---- معرض الصور: منفصل عن حالة الدوري حتى لا يُحمَّل مع كل تحديث دوري للنتائج ----
  loadPhotos(query?: PhotoQuery): Promise<PhotoPage>;
  addPhoto(input: PhotoInput): Promise<Result<GalleryPhoto>>;
  deletePhoto(id: string): Promise<Result>;
  /** عدد الصور وحجمها الكلي (null إن لم يتوفر) */
  photoUsage(): Promise<PhotoUsage | null>;
  /** صور الجولات المختارة (واحدة لكل جولة على الأكثر) */
  loadRoundPhotos(): Promise<GalleryPhoto[]>;
  /** اختيار صورة الجولة (round = null لإلغاء الاختيار). للأدمن ومحرر الأخبار */
  setRoundPhoto(id: string, round: number | null): Promise<Result>;

  // ---- مدرجات المباراة ----
  /** الرسائل المعتمدة لمباراة (للزوار) */
  loadMessages(matchId: string): Promise<MatchMessage[]>;
  /** إرسال رسالة (تظهر بعد موافقة الإدارة). device: معرّف عشوائي محفوظ في المتصفح لتقييد التكرار */
  submitMessage(matchId: string, author: string, body: string, device: string): Promise<Result>;
  /** للأدمن ومحرر الأخبار: الرسائل بانتظار المراجعة */
  loadPendingMessages(): Promise<MatchMessage[]>;
  reviewMessage(id: string, status: 'approved' | 'rejected'): Promise<Result>;

  // ---- توقعات المباريات (صوت واحد لكل جهاز) ----
  loadPredictionCounts(matchId: string): Promise<PredictionCounts>;
  submitPrediction(matchId: string, choice: PredictionChoice, device: string): Promise<Result>;
}
