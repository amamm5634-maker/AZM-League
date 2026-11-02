import type { SupabaseClient } from '@supabase/supabase-js';
import { isRole, type Role } from '../lib/roles';
import type { Result } from './repository';

export interface StaffMember {
  userId: string;
  email: string;
  role: Role;
  name: string | null;
}

type DbError = { message?: string; code?: string } | null | undefined;

/** يحوّل أخطاء الدوال في قاعدة البيانات إلى رسائل عربية مفهومة */
export function staffError(error: DbError, fallback: string): string {
  const msg = error?.message ?? '';
  if (/user_not_found/.test(msg)) {
    return 'لا يوجد حساب بهذا البريد. أنشئه أولاً من Supabase ← Authentication ← Users (مع تفعيل Auto Confirm User) ثم أعد المحاولة.';
  }
  if (/cannot_demote_self/.test(msg)) return 'لا يمكنك تغيير دور حسابك أنت، حتى لا تفقد صلاحية الإدارة.';
  if (/cannot_remove_self/.test(msg)) return 'لا يمكنك حذف حسابك أنت من الطاقم.';
  if (/bad_role/.test(msg)) return 'الدور غير صحيح.';
  if (error?.code === '42501' || /not authorized|permission denied/i.test(msg)) return 'هذا الإجراء للأدمن فقط.';
  if (/staff_(list|save|remove)/.test(msg) && /(could not find|does not exist|schema cache)/i.test(msg)) {
    return 'دوال إدارة الطاقم غير موجودة في قاعدة البيانات. شغّل ملف supabase/schema.sql مرة أخرى.';
  }
  return `${fallback}${msg ? ` (${msg})` : ''}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createStaffService(db: SupabaseClient) {
  return {
    async list(): Promise<Result<StaffMember[]>> {
      const { data, error } = await db.rpc('staff_list');
      if (error) return { ok: false, error: staffError(error, 'تعذّر تحميل الطاقم') };
      const rows = (data ?? []) as { user_id: string; email: string; role: string; name: string | null }[];
      const members: StaffMember[] = rows
        .filter((r) => isRole(r.role))
        .map((r) => ({ userId: r.user_id, email: r.email, role: r.role as Role, name: r.name }));
      return { ok: true, data: members, message: '' };
    },

    /** يضيف موظفاً بالبريد، أو يغيّر دور/اسم موظف موجود */
    async save(email: string, role: Role, name: string): Promise<Result> {
      const mail = email.trim();
      if (!EMAIL_RE.test(mail)) return { ok: false, error: 'اكتب بريداً إلكترونياً صحيحاً.' };
      if (!isRole(role)) return { ok: false, error: 'اختر الدور.' };
      const { error } = await db.rpc('staff_save', { p_email: mail, p_role: role, p_name: name.trim() });
      if (error) return { ok: false, error: staffError(error, 'تعذّر حفظ الموظف') };
      return { ok: true, data: undefined, message: 'تم حفظ الموظف.' };
    },

    async remove(userId: string): Promise<Result> {
      const { error } = await db.rpc('staff_remove', { p_user_id: userId });
      if (error) return { ok: false, error: staffError(error, 'تعذّر إزالة الموظف') };
      return { ok: true, data: undefined, message: 'تمت إزالة الموظف من الطاقم.' };
    },
  };
}

export type StaffService = ReturnType<typeof createStaffService>;
