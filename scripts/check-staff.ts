/**
 * يختبر الأدوار وإدارة الطاقم بدون واجهة: ما يراه كل دور، ورسائل الأخطاء العربية،
 * والتحقق قبل الاستدعاء. يستخدم عميل Supabase مزيّفاً (الدوال الحقيقية في schema.sql تُجرَّب على Supabase).
 * التشغيل: npm run check:staff
 */
import { ROLES, ROLE_HINTS, ROLE_LABELS, isRole, tabsForRole, type Role } from '../src/lib/roles';
import { createStaffService, staffError } from '../src/services/staff';

declare const process: { exit(code?: number): never };

const errors: string[] = [];
const expect = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };
const keys = (r: Role) => tabsForRole(r).map((t) => t.key).join(',');

type Call = { name: string; args: unknown };

function fakeDb(handler: (name: string, args: unknown) => { data?: unknown; error?: { message: string; code?: string } | null }) {
  const calls: Call[] = [];
  const db = {
    rpc: async (name: string, args?: unknown) => {
      calls.push({ name, args });
      const r = handler(name, args);
      return { data: r.data ?? null, error: r.error ?? null };
    },
  };
  return { db, calls };
}

async function main() {
  // ---- ما يراه كل دور ----
  expect(keys('scorer') === 'quick,results', `المسجّل يرى الميدان والنتائج فقط، لكنه يرى: ${keys('scorer')}`);
  expect(keys('editor') === 'news,photos', `محرر الأخبار يرى الأخبار والصور، لكنه يرى: ${keys('editor')}`);
  expect(keys('photographer') === 'photos', `المصوّر يرى الصور فقط، لكنه يرى: ${keys('photographer')}`);
  expect(keys('admin') === 'quick,results,news,photos,staff', `الأدمن يرى كل شيء مع الطاقم، لكنه يرى: ${keys('admin')}`);
  for (const r of ROLES) {
    if (r !== 'admin') expect(!keys(r).includes('staff'), `الدور ${r} يجب ألا يرى تبويب الطاقم`);
    expect(!!ROLE_LABELS[r] && !!ROLE_HINTS[r], `الدور ${r} ينقصه اسم أو وصف`);
    expect(tabsForRole(r).every((t) => !!t.label), `الدور ${r} فيه تبويب بلا عنوان`);
  }
  expect(isRole('admin') && !isRole('root') && !isRole(undefined), 'isRole');

  // ---- رسائل الأخطاء ----
  expect(staffError({ message: 'user_not_found' }, 'x').includes('أنشئه أولاً'), 'رسالة: حساب غير موجود');
  expect(staffError({ message: 'cannot_demote_self' }, 'x').includes('دور حسابك'), 'رسالة: تنزيل النفس');
  expect(staffError({ message: 'cannot_remove_self' }, 'x').includes('حسابك'), 'رسالة: حذف النفس');
  expect(staffError({ message: 'not authorized', code: '42501' }, 'x').includes('للأدمن'), 'رسالة: ليس أدمن');
  expect(staffError({ message: 'Could not find the function public.staff_save in the schema cache' }, 'x').includes('schema.sql'), 'رسالة: الدوال غير منشأة');
  expect(staffError({ message: 'boom' }, 'فشل').startsWith('فشل') && staffError({ message: 'boom' }, 'فشل').includes('boom'), 'رسالة: افتراضية');

  // ---- الإضافة ----
  let f = fakeDb(() => ({}));
  let svc = createStaffService(f.db as never);
  let r = await svc.save('  Ali@Example.com ', 'editor', '  علي  ');
  expect(r.ok, 'الإضافة الصحيحة فشلت');
  const sent = f.calls[0];
  expect(sent?.name === 'staff_save' && JSON.stringify(sent.args) === JSON.stringify({ p_email: 'Ali@Example.com', p_role: 'editor', p_name: 'علي' }), 'يجب قصّ المسافات وإرسال المعاملات الصحيحة');

  f = fakeDb(() => ({}));
  svc = createStaffService(f.db as never);
  r = await svc.save('not-an-email', 'editor', '');
  expect(!r.ok && f.calls.length === 0, 'بريد غير صالح: يُرفض قبل أي استدعاء');
  r = await svc.save('a@b.com', 'root' as Role, '');
  expect(!r.ok && f.calls.length === 0, 'دور غير معروف: يُرفض قبل أي استدعاء');

  f = fakeDb(() => ({ error: { message: 'user_not_found' } }));
  svc = createStaffService(f.db as never);
  r = await svc.save('ghost@example.com', 'scorer', '');
  expect(!r.ok && r.error.includes('Authentication'), 'حساب غير موجود يعطي إرشاد الإنشاء من Authentication');

  // ---- القائمة ----
  f = fakeDb(() => ({ data: [
    { user_id: 'u1', email: 'a@x.com', role: 'admin', name: 'رامي' },
    { user_id: 'u2', email: 'b@x.com', role: 'scorer', name: null },
    { user_id: 'u3', email: 'c@x.com', role: 'hacker', name: 'x' },
  ] }));
  svc = createStaffService(f.db as never);
  const l = await svc.list();
  expect(l.ok && l.data.length === 2 && l.data[0].userId === 'u1' && l.data[1].name === null, 'القائمة: تحويل الحقول وتجاهل الأدوار المجهولة');
  f = fakeDb(() => ({ error: { message: 'x', code: '42501' } }));
  svc = createStaffService(f.db as never);
  const denied = await svc.list();
  expect(!denied.ok && denied.error.includes('للأدمن'), 'القائمة: رفض غير الأدمن');

  // ---- الإزالة ----
  f = fakeDb(() => ({}));
  svc = createStaffService(f.db as never);
  const rm = await svc.remove('u2');
  expect(rm.ok && f.calls[0]?.name === 'staff_remove' && JSON.stringify(f.calls[0].args) === JSON.stringify({ p_user_id: 'u2' }), 'الإزالة تستدعي staff_remove');
  f = fakeDb(() => ({ error: { message: 'cannot_remove_self' } }));
  svc = createStaffService(f.db as never);
  const self = await svc.remove('me');
  expect(!self.ok && self.error.includes('حسابك'), 'إزالة النفس تعطي رسالة واضحة');

  if (errors.length) {
    console.error(`فشلت ${errors.length} فحوصات:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log('✓ الأدوار وإدارة الطاقم: كل الفحوصات نجحت');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
