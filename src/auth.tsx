import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './services/supabaseClient';

import { ROLE_LABELS, type Role } from './lib/roles';

// الأدوار تعيش في lib/roles.ts (منطق صرف قابل للاختبار)، ونعيد تصديرها هنا لبقية الملفات
export { ROLE_LABELS };
export type { Role };

interface AuthValue {
  /** هل تسجيل الدخول الحقيقي مفعّل (Supabase مضبوط)؟ */
  enabled: boolean;
  loading: boolean;
  email: string | null;
  role: Role | null;
  name: string | null;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

interface StaffInfo { role: Role | null; name: string | null }

async function loadStaff(userId: string): Promise<StaffInfo> {
  if (!supabase) return { role: null, name: null };
  const { data } = await supabase.from('staff').select('role,name').eq('user_id', userId).maybeSingle();
  return { role: (data?.role as Role | undefined) ?? null, name: (data?.name as string | null | undefined) ?? null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const enabled = supabase !== null;
  const [loading, setLoading] = useState(enabled);
  const [email, setEmail] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffInfo>({ role: null, name: null });

  useEffect(() => {
    if (!supabase) return;
    let alive = true;

    const apply = async (user: { id: string; email?: string | null } | null | undefined) => {
      if (!alive) return;
      if (!user) {
        setEmail(null);
        setStaff({ role: null, name: null });
        setLoading(false);
        return;
      }
      setEmail(user.email ?? null);
      const info = await loadStaff(user.id).catch(() => ({ role: null, name: null }) as StaffInfo);
      if (!alive) return;
      setStaff(info);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // نؤجل الاستدعاء خارج الـ callback لتفادي تعليق المكتبة
      window.setTimeout(() => apply(session?.user), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (mail: string, password: string): Promise<string | null> => {
    if (!supabase) return 'تسجيل الدخول غير مفعّل.';
    const { error } = await supabase.auth.signInWithPassword({ email: mail.trim(), password });
    if (error) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    return null;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ enabled, loading, email, role: staff.role, name: staff.name, signIn, signOut }),
    [enabled, loading, email, staff, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
