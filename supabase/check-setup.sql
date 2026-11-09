-- فحص إعداد Supabase: يعرض كل عنصر يحتاجه الموقع وهل هو موجود (✅) أو ناقص (❌) وأي ملف يصلحه.
-- للقراءة فقط: لا يغيّر شيئاً. الصقه في SQL Editor واضغط Run، ثم انظر الصفوف التي فيها ❌.

with chk(ord, item, ok, fix) as (
  values
  -- الجداول
  (1,  'جدول staff (الطاقم)',               to_regclass('public.staff') is not null,            'schema.sql'),
  (2,  'جدول match_state (حالة المباراة)',  to_regclass('public.match_state') is not null,      'schema.sql'),
  (3,  'جدول goal_events (الأهداف)',        to_regclass('public.goal_events') is not null,      'schema.sql'),
  (4,  'جدول news (الأخبار)',               to_regclass('public.news') is not null,             'schema.sql'),
  (5,  'جدول gallery_photos (المعرض)',      to_regclass('public.gallery_photos') is not null,   'schema.sql'),
  (6,  'جدول match_lineups (التشكيلات)',    to_regclass('public.match_lineups') is not null,    'schema.sql أو lineups.sql'),
  (7,  'جدول match_cards (الكروت)',         to_regclass('public.match_cards') is not null,      'cards.sql'),
  (8,  'جدول match_subs (التبديلات)',       to_regclass('public.match_subs') is not null,       'subs.sql'),
  (9,  'جدول match_messages (رسائل المدرجات)', to_regclass('public.match_messages') is not null, 'match-messages.sql'),
  (10, 'جدول match_predictions (التوقعات)', to_regclass('public.match_predictions') is not null, 'predictions.sql'),
  -- أعمدة
  (20, 'عمود أفضل لاعب match_state.motm_player_id',
       exists (select 1 from information_schema.columns where table_schema='public' and table_name='match_state' and column_name='motm_player_id'), 'schema.sql'),
  (21, 'عمود صورة الجولة gallery_photos.round_pick',
       exists (select 1 from information_schema.columns where table_schema='public' and table_name='gallery_photos' and column_name='round_pick'), 'round-photo.sql'),
  (22, 'عمود مراكز التشكيلة match_lineups.positions',
       exists (select 1 from information_schema.columns where table_schema='public' and table_name='match_lineups' and column_name='positions'), 'lineup-positions.sql'),
  -- دوال
  (30, 'دالة has_role',            exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='has_role'), 'schema.sql'),
  (31, 'دالة gallery_usage',       exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='gallery_usage'), 'schema.sql'),
  (32, 'دوال الطاقم staff_list/save/remove',
       (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ('staff_list','staff_save','staff_remove')) = 3, 'schema.sql'),
  (33, 'دالة set_round_photo',     exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='set_round_photo'), 'round-photo.sql'),
  (34, 'دالة submit_match_message', exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='submit_match_message'), 'match-messages.sql'),
  (35, 'دوال التوقعات submit_prediction/prediction_counts',
       (select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ('submit_prediction','prediction_counts')) = 2, 'predictions.sql'),
  (36, 'دالة clear_lineup',        exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='clear_lineup'), 'schema.sql أو lineups.sql'),
  (37, 'save_lineup بصيغة المراكز (4 معاملات)',
       exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='save_lineup' and pronargs=4), 'lineup-positions.sql'),
  (38, 'لا توجد save_lineup قديمة (3 معاملات) بجانب الجديدة',
       not exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='save_lineup' and pronargs=3)
       or not exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='save_lineup' and pronargs=4),
       'لو ❌: شغّل lineup-positions.sql (يحذف القديمة). وبعد أي تشغيل لـ schema.sql كاملاً شغّله مرة ثانية'),
  (39, 'reset_match محدّثة (تمسح الكروت والتبديلات)',
       exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='reset_match' and prosrc ilike '%match_subs%' and prosrc ilike '%match_cards%'),
       'subs.sql (آخر نسخة)'),
  -- التخزين
  (40, 'مخزن الصور media',
       exists (select 1 from storage.buckets where id='media'), 'schema.sql'),
  -- الأمان (RLS) على كل الجداول الموجودة
  (50, 'RLS مفعّل على كل جداول الموقع',
       not exists (
         select 1 from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r'
           and c.relname in ('staff','match_state','goal_events','news','gallery_photos','match_lineups','match_cards','match_subs','match_messages','match_predictions')
           and not c.relrowsecurity),
       'شغّل الملف الخاص بالجدول (فيه enable row level security)'),
  -- الحساب الأول
  (60, 'يوجد أدمن واحد على الأقل في staff',
       case when to_regclass('public.staff') is null then false
            else ((xpath('/row/c/text()', query_to_xml('select count(*) as c from public.staff where role = ''admin''', false, true, '')))[1])::text::int > 0 end,
       'first-admin.sql')
)
select case when ok then '✅' else '❌' end as "الحالة", item as "العنصر", case when ok then '' else fix end as "الإصلاح"
from chk order by ok, ord;
