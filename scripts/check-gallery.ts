/**
 * يختبر منطق معرض الصور بدون واجهة ولا Supabase حقيقي:
 * التحقق، الرفع، التراجع عند الفشل (لا ملفات يتيمة)، الترقيم، الحذف، وربط الصور بالمباراة.
 * يستخدم "عميل Supabase مزيّف" في الذاكرة. التشغيل: npm run check:gallery
 */
import { SupabaseRepository } from '../src/services/supabaseRepository';
import { LocalStorageRepository } from '../src/services/localRepository';
import { extForMime, fitWithin, formatBytes, photosForMatch } from '../src/lib/gallery';
import type { GalleryPhoto } from '../src/types';

declare const process: { exit(code?: number): never };

type Row = Record<string, unknown>;
type Err = { message: string; code?: string } | null;

/** عميل Supabase مزيّف يكفي لاختبار جدول gallery_photos والتخزين */
class FakeDb {
  rows: Row[] = [];
  files = new Set<string>();
  clock = 0;
  failUploadMatching: RegExp | null = null;
  failInsert: Err = null;
  failRemove = false;
  usageRpc: unknown = [{ count: 3, bytes: 1234567 }];

  from(table: string) {
    return new Query(this, table);
  }
  storage = {
    from: (_bucket: string) => ({
      upload: async (path: string, _file: Blob): Promise<{ error: Err }> => {
        if (this.failUploadMatching?.test(path)) return { error: { message: 'upload failed' } };
        this.files.add(path);
        return { error: null };
      },
      remove: async (paths: string[]): Promise<{ error: Err }> => {
        if (this.failRemove) return { error: { message: 'denied', code: '42501' } };
        paths.forEach((p) => this.files.delete(p));
        return { error: null };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/media/${path}` } }),
    }),
  };
  async rpc(_name: string): Promise<{ data: unknown; error: Err }> {
    return { data: this.usageRpc, error: null };
  }
}

class Query {
  private op: 'select' | 'insert' | 'delete' = 'select';
  private payload: Row = {};
  private filters: [string, unknown][] = [];
  private range_: [number, number] | null = null;
  private mode: 'many' | 'single' | 'maybe' = 'many';
  private returning = false;
  constructor(private db: FakeDb, private table: string) {}
  select(_cols?: string) { if (this.op === 'insert') this.returning = true; return this; }
  insert(row: Row) { this.op = 'insert'; this.payload = row; return this; }
  delete() { this.op = 'delete'; return this; }
  order(_c: string, _o?: unknown) { return this; }
  eq(c: string, v: unknown) { this.filters.push([c, v]); return this; }
  range(a: number, b: number) { this.range_ = [a, b]; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  // يجعل الاستعلام قابلاً لـ await مثل مُنشئ استعلامات Supabase الحقيقي
  then(res: (v: { data: unknown; error: Err }) => unknown, rej?: (e: unknown) => unknown) {
    return this.exec().then(res, rej);
  }
  private async exec(): Promise<{ data: unknown; error: Err }> {
    if (this.table !== 'gallery_photos') return { data: [], error: null };
    const match = (r: Row) => this.filters.every(([c, v]) => r[c] === v);
    if (this.op === 'insert') {
      if (this.db.failInsert) return { data: null, error: this.db.failInsert };
      const row: Row = { id: `id-${this.db.rows.length + 1}-${Math.random().toString(36).slice(2, 5)}`, created_at: new Date(Date.UTC(2026, 10, 15, 12, 0, this.db.clock++)).toISOString(), ...this.payload };
      this.db.rows.push(row);
      return { data: this.returning ? row : null, error: null };
    }
    if (this.op === 'delete') {
      this.db.rows = this.db.rows.filter((r) => !match(r));
      return { data: null, error: null };
    }
    // select: الأحدث أولاً (يطابق order created_at desc)
    let list = this.db.rows.filter(match).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    if (this.range_) list = list.slice(this.range_[0], this.range_[1] + 1);
    if (this.mode === 'single') return list[0] ? { data: list[0], error: null } : { data: null, error: { message: 'no rows' } };
    if (this.mode === 'maybe') return { data: list[0] ?? null, error: null };
    return { data: list, error: null };
  }
}

const errors: string[] = [];
const expect = (cond: boolean, msg: string) => { if (!cond) errors.push(msg); };

const blob = (bytes: number, type = 'image/webp') => new Blob([new Uint8Array(bytes)], { type });
const input = (over: Record<string, unknown> = {}) => ({ file: blob(300_000), thumb: blob(30_000), width: 1600, height: 1067, ...over });

async function main() {
  // ---- دوال مساعدة ----
  expect(JSON.stringify(fitWithin(4000, 3000, 1600)) === JSON.stringify({ width: 1600, height: 1200 }), 'fitWithin أفقية');
  expect(JSON.stringify(fitWithin(3000, 4000, 1600)) === JSON.stringify({ width: 1200, height: 1600 }), 'fitWithin عمودية');
  expect(JSON.stringify(fitWithin(800, 600, 1600)) === JSON.stringify({ width: 800, height: 600 }), 'fitWithin لا يكبّر الصور الصغيرة');
  expect(fitWithin(10000, 1, 1600).height === 1, 'fitWithin لا يعطي ارتفاعاً صفرياً');
  expect(extForMime('image/webp') === 'webp' && extForMime('image/jpeg') === 'jpg' && extForMime('image/png') === null, 'extForMime');
  expect(formatBytes(512 * 1024) === '512 ك.ب' && formatBytes(5 * 1024 * 1024) === '5.0 م.ب', 'formatBytes');

  // ---- الرفع الناجح ----
  const db = new FakeDb();
  const repo = new SupabaseRepository(db as never);
  let r = await repo.addPhoto(input({ matchId: 'm1', caption: '  هدف الفوز  ' }));
  expect(r.ok, 'الرفع الصحيح فشل');
  if (r.ok) {
    expect(r.data.caption === 'هدف الفوز', 'يجب قصّ مسافات التعليق');
    expect(r.data.matchId === 'm1', 'ربط المباراة');
    expect(r.data.url.includes('/gallery/') && r.data.thumb.includes('-t.webp'), 'روابط الصورة والمصغّرة');
  }
  expect(db.files.size === 2 && db.rows.length === 1, 'يجب رفع ملفين وإضافة صف واحد');
  expect(db.rows[0]?.size_bytes === 330_000, 'حجم الصورة يجب أن يشمل المصغّرة (لعدّاد المساحة)');

  // ---- التحقق لا يلمس التخزين ----
  const before = db.files.size;
  r = await repo.addPhoto(input({ file: blob(100, 'image/png') }));
  expect(!r.ok, 'يجب رفض PNG غير مضغوط (الضغط يحوّله WebP/JPEG)');
  r = await repo.addPhoto(input({ file: blob(3 * 1024 * 1024 + 1) }));
  expect(!r.ok, 'يجب رفض ملف أكبر من 3 ميجا');
  r = await repo.addPhoto(input({ caption: 'ا'.repeat(201) }));
  expect(!r.ok, 'يجب رفض تعليق أطول من 200');
  expect(db.files.size === before && db.rows.length === 1, 'الحالات المرفوضة يجب ألا ترفع شيئاً');

  // ---- فشل رفع المصغّرة: لا ملفات يتيمة ----
  db.failUploadMatching = /-t\./;
  r = await repo.addPhoto(input());
  expect(!r.ok, 'يجب أن يفشل عند فشل رفع المصغّرة');
  expect(db.files.size === before && db.rows.length === 1, 'يجب حذف الصورة الكاملة عند فشل المصغّرة');
  db.failUploadMatching = null;

  // ---- فشل الإدخال في الجدول: لا ملفات يتيمة + رسالة صلاحيات ----
  db.failInsert = { message: 'new row violates row-level security policy', code: '42501' };
  r = await repo.addPhoto(input());
  expect(!r.ok && r.error.includes('صلاحية'), 'يجب إظهار رسالة الصلاحيات عند رفض RLS');
  expect(db.files.size === before && db.rows.length === 1, 'يجب حذف الملفين عند فشل الإدخال');
  db.failInsert = null;

  // ---- الترقيم والفلترة ----
  for (let i = 0; i < 4; i++) await repo.addPhoto(input({ matchId: i % 2 === 0 ? 'm2' : undefined }));
  // الآن 5 صور: m1 (الأقدم) + 4 بعدها
  let page = await repo.loadPhotos({ limit: 2, offset: 0 });
  expect(page.photos.length === 2 && page.hasMore, 'الصفحة الأولى: 2 مع وجود المزيد');
  page = await repo.loadPhotos({ limit: 2, offset: 4 });
  expect(page.photos.length === 1 && !page.hasMore, 'الصفحة الأخيرة: صورة واحدة بلا مزيد');
  page = await repo.loadPhotos({ limit: 24 });
  expect(page.photos.length === 5 && !page.hasMore, 'تحميل الكل');
  expect(page.photos[page.photos.length - 1].caption === 'هدف الفوز', 'الأحدث أولاً: الأقدم في الآخر');
  page = await repo.loadPhotos({ matchId: 'm2' });
  expect(page.photos.length === 2 && page.photos.every((p) => p.matchId === 'm2'), 'فلتر المباراة');
  page = await repo.loadPhotos({ limit: 9999 });
  expect(page.photos.length === 5, 'حد الصفحة يُقيَّد بـ 100');

  // ---- الحذف ----
  const victim = page.photos[0];
  const filesBefore = db.files.size;
  let d = await repo.deletePhoto(victim.id);
  expect(d.ok, 'الحذف فشل');
  expect(db.rows.length === 4 && db.files.size === filesBefore - 2, 'الحذف يجب أن يزيل الصف والملفين');
  d = await repo.deletePhoto(victim.id);
  expect(!d.ok, 'حذف صورة محذوفة يجب أن يرجع خطأ واضحاً');
  db.failRemove = true;
  const next = (await repo.loadPhotos()).photos[0];
  d = await repo.deletePhoto(next.id);
  expect(d.ok && d.message.includes('تعذّر حذف ملفها'), 'عند فشل حذف الملف يُحذف الصف ويُحذَّر المستخدم');
  db.failRemove = false;

  // ---- استهلاك المساحة ----
  let u = await repo.photoUsage();
  expect(u?.count === 3 && u.bytes === 1234567, 'photoUsage يقرأ دالة gallery_usage');
  db.usageRpc = null;
  u = await repo.photoUsage();
  expect(u === null, 'photoUsage يرجع null عند غياب الدالة (لا يكسر اللوحة)');

  // ---- النسخة المحلية (بدون Supabase) ----
  const local = new LocalStorageRepository();
  expect((await local.loadPhotos()).photos.length === 0, 'المحلي: معرض فارغ');
  expect(!(await local.addPhoto(input())).ok, 'المحلي: الرفع يجب أن يرفض برسالة واضحة');
  expect(!(await local.deletePhoto('x')).ok && (await local.photoUsage()) === null, 'المحلي: حذف/استهلاك');

  // ---- صور مباراة ----
  const mk = (id: string, matchId: string | undefined, at: string): GalleryPhoto => ({ id, url: '', thumb: '', matchId, createdAt: at });
  const list = [mk('a', 'm1', '2026-11-15T10:00:00Z'), mk('b', 'm2', '2026-11-15T11:00:00Z'), mk('c', 'm1', '2026-11-15T12:00:00Z')];
  expect(photosForMatch(list, 'm1').map((p) => p.id).join() === 'c,a', 'photosForMatch: فلترة وترتيب الأحدث أولاً');

  if (errors.length) {
    console.error(`فشلت ${errors.length} فحوصات:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  console.log('✓ معرض الصور: كل الفحوصات نجحت');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
