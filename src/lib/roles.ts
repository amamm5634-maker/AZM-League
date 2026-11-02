/** الأدوار وما يراه كل دور في لوحة الإدارة (منطق صرف بلا واجهة، ليسهل اختباره) */

export type Role = 'admin' | 'editor' | 'photographer' | 'scorer';
export type AdminTab = 'quick' | 'results' | 'news' | 'photos' | 'staff';

export const ROLES: Role[] = ['scorer', 'editor', 'photographer', 'admin'];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'أدمن',
  editor: 'محرر أخبار',
  photographer: 'مصوّر',
  scorer: 'مسجّل نتائج',
};

/** وصف قصير يظهر في صفحة الطاقم: ماذا يرى هذا الدور */
export const ROLE_HINTS: Record<Role, string> = {
  scorer: 'وضع الميدان والنتائج والأهداف',
  editor: 'الأخبار والصور (نشر وتعديل وحذف)',
  photographer: 'رفع الصور فقط',
  admin: 'كل شيء، ومنه إدارة الطاقم',
};

const TAB_LABELS: Record<AdminTab, string> = {
  quick: 'وضع الميدان',
  results: 'النتائج والأهداف',
  news: 'الأخبار',
  photos: 'الصور',
  staff: 'الطاقم',
};

const TAB_ROLES: Record<AdminTab, Role[]> = {
  quick: ['admin', 'scorer'],
  results: ['admin', 'scorer'],
  news: ['admin', 'editor'],
  photos: ['admin', 'editor', 'photographer'],
  staff: ['admin'],
};

const TAB_ORDER: AdminTab[] = ['quick', 'results', 'news', 'photos', 'staff'];

/** التبويبات التي يراها هذا الدور، بالترتيب */
export function tabsForRole(role: Role): { key: AdminTab; label: string }[] {
  return TAB_ORDER.filter((t) => TAB_ROLES[t].includes(role)).map((key) => ({ key, label: TAB_LABELS[key] }));
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}
