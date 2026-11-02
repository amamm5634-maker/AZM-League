import type { TournamentRepository } from './repository';
import { LocalStorageRepository } from './localRepository';
import { SupabaseRepository } from './supabaseRepository';
import { supabase } from './supabaseClient';

/**
 * نقطة الربط الوحيدة بين الواجهة والبيانات:
 * إذا ضُبطت مفاتيح Supabase (ملف .env.local) تعمل النسخة الحية، وإلا النسخة المحلية التجريبية.
 */
export const repository: TournamentRepository = supabase
  ? new SupabaseRepository(supabase)
  : new LocalStorageRepository();

export type { NewsInput, PhotoInput, PhotoPage, PhotoQuery, PhotoUsage, Result, TournamentRepository } from './repository';
