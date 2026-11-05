/** الأدوار وما يراه كل دور في لوحة الإدارة (منطق صرف بلا واجهة، ليسهل اختباره) */

export type Role = 'admin' | 'editor' | 'photographer' | 'scorer';
export type AdminTab = 'quick' | 'lineups' | 'results' | 'news' | 'photos' | 'messages' | 'staff';

export const ROLES: Role[] = ['scorer', 'editor', 'photographer', 'admin'];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'أدمن',
  editor: 'محرر أخبار',
  photographer: 'مصوّر',
  scorer: 'مسجّل نتائج',
};

/** وصف قصير يظهر في صفحة الطاقم: ماذا يرى هذا الدور */
export const ROLE_HINTS: Record<Role, string> = {
  scorer: 'وضع الميدان والتشكيلات والنتائج والأهداف',
  editor: 'الأخبار والصور ومراجعة رسائل المدرجات',
  photographer: 'رفع الصور فقط',
  admin: 'كل شيء، ومنه إدارة الطاقم',
};

const TAB_LABELS: Record<AdminTab, string> = {
  quick: 'وضع الميدان',
  lineups: 'التشكيلات',
  results: 'النتائج والأهداف',
  news: 'الأخبار',
  photos: 'الصور',
  messages: 'رسائل المدرجات',
  staff: 'الطاقم',
};

const TAB_ROLES: Record<AdminTab, Role[]> = {
  quick: ['admin', 'scorer'],
  lineups: ['admin', 'scorer'],
  results: ['admin', 'scorer'],
  news: ['admin', 'editor'],
  photos: ['admin', 'editor', 'photographer'],
  messages: ['admin', 'editor'],
  staff: ['admin'],
};

const TAB_ORDER: AdminTab[] = ['quick', 'lineups', 'results', 'news', 'photos', 'messages', 'staff'];

/** التبويبات التي يراها هذا الدور، بالترتيب */
export function tabsForRole(role: Role): { key: AdminTab; label: string }[] {
  return TAB_ORDER.filter((t) => TAB_ROLES[t].includes(role)).map((key) => ({ key, label: TAB_LABELS[key] }));
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}
