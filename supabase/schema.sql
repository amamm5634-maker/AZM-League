-- ============================================================
-- دوري عزم — مخطط Supabase
-- الصقه كاملاً في: Supabase → SQL Editor → New query → Run
-- آمن للتشغيل أكثر من مرة.
-- ============================================================

-- ---------- 1) الموظفون والأدوار ----------
create table if not exists public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'photographer', 'scorer')),
  name text,
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;

drop policy if exists "staff reads own row" on public.staff;
create policy "staff reads own row" on public.staff
  for select to authenticated using (user_id = auth.uid());

-- هل المستخدم الحالي له أحد هذه الأدوار؟
create or replace function public.has_role(allowed text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.staff
    where user_id = auth.uid() and role = any (allowed)
  );
$$;

-- ---------- 2) حالة المباريات (النتيجة والحالة) ----------
create table if not exists public.match_state (
  match_id text primary key,
  home_score integer not null default 0 check (home_score between 0 and 99),
  away_score integer not null default 0 check (away_score between 0 and 99),
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed')),
  motm_player_id text,
  updated_at timestamptz not null default now()
);
-- لقواعد البيانات المنشأة سابقاً: أضف عمود أفضل لاعب في المباراة
alter table public.match_state add column if not exists motm_player_id text;

-- ---------- 3) الأهداف ----------
create table if not exists public.goal_events (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,
  team_id text not null,
  scorer_id text not null,
  assist_id text,
  minute integer check (minute between 1 and 120),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists goal_events_match_idx on public.goal_events (match_id);

-- ---------- 4) الأخبار ----------
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  summary text not null check (char_length(summary) between 3 and 2000),
  tag text not null default 'خبر',
  image_url text,
  published_at date not null default current_date,
  created_by uuid default auth.uid()
);

-- ---------- 5) سياسات الأمان (RLS) ----------
alter table public.match_state enable row level security;
alter table public.goal_events enable row level security;
alter table public.news enable row level security;

-- القراءة متاحة للجميع
drop policy if exists "public read match_state" on public.match_state;
create policy "public read match_state" on public.match_state for select to anon, authenticated using (true);
drop policy if exists "public read goal_events" on public.goal_events;
create policy "public read goal_events" on public.goal_events for select to anon, authenticated using (true);
drop policy if exists "public read news" on public.news;
create policy "public read news" on public.news for select to anon, authenticated using (true);

-- الكتابة: النتائج والأهداف للأدمن ومسجّل النتائج
drop policy if exists "scorers write match_state" on public.match_state;
create policy "scorers write match_state" on public.match_state
  for all to authenticated
  using (public.has_role(array['admin', 'scorer']))
  with check (public.has_role(array['admin', 'scorer']));

drop policy if exists "scorers write goal_events" on public.goal_events;
create policy "scorers write goal_events" on public.goal_events
  for all to authenticated
  using (public.has_role(array['admin', 'scorer']))
  with check (public.has_role(array['admin', 'scorer']));

-- الكتابة: الأخبار للأدمن ومحرر الأخبار
drop policy if exists "editors write news" on public.news;
create policy "editors write news" on public.news
  for all to authenticated
  using (public.has_role(array['admin', 'editor']))
  with check (public.has_role(array['admin', 'editor']));

-- ---------- 6) تخزين الصور ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');

drop policy if exists "media staff upload" on storage.objects;
create policy "media staff upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.has_role(array['admin', 'editor', 'photographer']));

drop policy if exists "media staff delete" on storage.objects;
create policy "media staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.has_role(array['admin', 'editor']));

-- ---------- 6ب) معرض المصوّر ----------
-- الصور تُضغط في المتصفح قبل الرفع (~300 ك.ب للصورة + مصغّرة). نخزّن المسارات فقط.
create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  thumb_path text not null,
  match_id text,
  caption text check (caption is null or char_length(caption) <= 200),
  width integer,
  height integer,
  size_bytes integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists gallery_photos_created_idx on public.gallery_photos (created_at desc);
create index if not exists gallery_photos_match_idx on public.gallery_photos (match_id, created_at desc);
alter table public.gallery_photos enable row level security;

drop policy if exists "public read gallery_photos" on public.gallery_photos;
create policy "public read gallery_photos" on public.gallery_photos for select to anon, authenticated using (true);

-- الإضافة: الأدمن والمصوّر ومحرر الأخبار (نفس من يرفعون للـ bucket)
drop policy if exists "staff insert gallery_photos" on public.gallery_photos;
create policy "staff insert gallery_photos" on public.gallery_photos
  for insert to authenticated
  with check (public.has_role(array['admin', 'photographer', 'editor']));

-- الحذف: الأدمن ومحرر الأخبار فقط (مثل حذف الملفات من التخزين)
drop policy if exists "editors delete gallery_photos" on public.gallery_photos;
create policy "editors delete gallery_photos" on public.gallery_photos
  for delete to authenticated
  using (public.has_role(array['admin', 'editor']));

-- عدد الصور وحجمها الكلي (لعدّاد المساحة في لوحة الإدارة)
create or replace function public.gallery_usage()
returns table (count bigint, bytes bigint)
language sql
stable
as $$
  select count(*)::bigint, coalesce(sum(size_bytes), 0)::bigint from public.gallery_photos;
$$;

-- ---------- 6ج) إدارة الطاقم من اللوحة (للأدمن فقط) ----------
-- إنشاء الحساب (البريد وكلمة المرور) يظل من Authentication → Users،
-- ثم يضيفه الأدمن من لوحة الإدارة ويحدد دوره بدل كتابة SQL.

-- قائمة الطاقم مع البريد (لا تُرجع شيئاً لغير الأدمن)
create or replace function public.staff_list()
returns table (user_id uuid, email text, role text, name text)
language sql
security definer
set search_path = public, auth
stable
as $$
  select s.user_id, u.email::text, s.role, s.name
  from public.staff s
  join auth.users u on u.id = s.user_id
  where public.has_role(array['admin'])
  order by s.created_at;
$$;

-- إضافة موظف بالبريد أو تغيير دوره/اسمه
create or replace function public.staff_save(p_email text, p_role text, p_name text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  if not public.has_role(array['admin']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'editor', 'photographer', 'scorer') then
    raise exception 'bad_role';
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then
    raise exception 'user_not_found';
  end if;
  -- حماية: لا يُنزل الأدمن دور نفسه فيقفل اللوحة على الجميع
  if uid = auth.uid() and p_role <> 'admin' then
    raise exception 'cannot_demote_self';
  end if;
  insert into public.staff (user_id, role, name)
  values (uid, p_role, nullif(trim(coalesce(p_name, '')), ''))
  on conflict (user_id) do update set role = excluded.role, name = excluded.name;
end;
$$;

-- إزالة موظف (يفقد الدخول للوحة؛ حسابه يبقى في Authentication)
create or replace function public.staff_remove(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_role(array['admin']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_remove_self';
  end if;
  delete from public.staff where user_id = p_user_id;
end;
$$;

revoke all on function public.staff_list() from public, anon;
revoke all on function public.staff_save(text, text, text) from public, anon;
revoke all on function public.staff_remove(uuid) from public, anon;
grant execute on function public.staff_list() to authenticated;
grant execute on function public.staff_save(text, text, text) to authenticated;
grant execute on function public.staff_remove(uuid) to authenticated;

-- ---------- 7) إضافة موظف (نفّذها بعد إنشاء المستخدم من Authentication → Users) ----------
-- insert into public.staff (user_id, role, name)
-- values ('ضع-هنا-UUID-المستخدم', 'admin', 'الاسم');
-- الأدوار: admin | editor | photographer | scorer

-- ============================================================
-- صلاحيات الجداول لـ Data API (لازمة لو "Automatically expose new tables" مطفية)
-- الأمان الفعلي يظل في سياسات RLS أعلاه.
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select on public.match_state, public.goal_events, public.news, public.gallery_photos to anon, authenticated;
grant insert, update, delete on public.match_state, public.goal_events, public.news, public.gallery_photos to authenticated;
grant select on public.staff to authenticated;
grant execute on function public.gallery_usage() to anon, authenticated;
grant execute on function public.has_role(text[]) to anon, authenticated;

-- ---------- 6د) صورة الجولة ----------
-- صورة الجولة: صورة واحدة مختارة لكل جولة (1 إلى 3). شغّله مرة واحدة في SQL Editor.
alter table public.gallery_photos
  add column if not exists round_pick smallint check (round_pick is null or round_pick between 1 and 3);

-- صورة واحدة فقط لكل جولة
create unique index if not exists gallery_photos_round_pick_uidx
  on public.gallery_photos (round_pick) where round_pick is not null;

-- الاختيار عبر دالة: تنقل الاختيار من الصورة القديمة إلى الجديدة دفعة واحدة، للأدمن ومحرر الأخبار فقط
create or replace function public.set_round_photo(p_photo uuid, p_round smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(array['admin', 'editor']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_round is not null and (p_round < 1 or p_round > 3) then
    raise exception 'invalid round' using errcode = '22023';
  end if;
  if p_round is not null then
    update public.gallery_photos set round_pick = null where round_pick = p_round and id <> p_photo;
  end if;
  update public.gallery_photos set round_pick = p_round where id = p_photo;
end;
$$;

revoke all on function public.set_round_photo(uuid, smallint) from public, anon;
grant execute on function public.set_round_photo(uuid, smallint) to authenticated;

-- ---------- 6هـ) مدرجات المباراة ----------
-- مدرجات المباراة: رسائل الجمهور تُراجَع قبل النشر. شغّله مرة واحدة في SQL Editor.
create table if not exists public.match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id text not null check (char_length(match_id) between 2 and 20),
  author text not null default 'مشجع' check (char_length(author) between 1 and 24),
  body text not null check (char_length(body) between 3 and 140),
  device text not null check (char_length(device) between 8 and 64),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid
);
create index if not exists match_messages_match_idx on public.match_messages (match_id, status, created_at desc);
create index if not exists match_messages_device_idx on public.match_messages (device, created_at desc);
alter table public.match_messages enable row level security;

-- الزوار يرون المعتمد فقط
drop policy if exists "public read approved messages" on public.match_messages;
create policy "public read approved messages" on public.match_messages
  for select to anon, authenticated using (status = 'approved');

-- الأدمن ومحرر الأخبار يرون الكل ويراجعون
drop policy if exists "staff read all messages" on public.match_messages;
create policy "staff read all messages" on public.match_messages
  for select to authenticated using (public.has_role(array['admin', 'editor']));
drop policy if exists "staff review messages" on public.match_messages;
create policy "staff review messages" on public.match_messages
  for update to authenticated
  using (public.has_role(array['admin', 'editor']))
  with check (public.has_role(array['admin', 'editor']));
drop policy if exists "staff delete messages" on public.match_messages;
create policy "staff delete messages" on public.match_messages
  for delete to authenticated using (public.has_role(array['admin', 'editor']));

grant select on public.match_messages to anon, authenticated;
grant update (status, reviewed_by), delete on public.match_messages to authenticated;

-- الإرسال من الزوار عبر دالة فقط (لا إدراج مباشر): تتحقق من الطول وتحدّ التكرار لكل جهاز
create or replace function public.submit_match_message(p_match text, p_author text, p_body text, p_device text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a text := nullif(btrim(coalesce(p_author, '')), '');
  b text := btrim(coalesce(p_body, ''));
begin
  if p_match is null or p_match !~ '^m[0-9]{1,4}$' then
    raise exception 'invalid_match' using errcode = '22023';
  end if;
  if char_length(b) < 3 or char_length(b) > 140 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;
  if p_device is null or char_length(p_device) < 8 or char_length(p_device) > 64 then
    raise exception 'invalid_device' using errcode = '22023';
  end if;
  -- حدّ التكرار: رسالتان كل 5 دقائق و12 رسالة في اليوم لكل جهاز
  if (select count(*) from public.match_messages where device = p_device and created_at > now() - interval '5 minutes') >= 2
     or (select count(*) from public.match_messages where device = p_device and created_at > now() - interval '1 day') >= 12 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  insert into public.match_messages (match_id, author, body, device)
  values (p_match, left(coalesce(a, 'مشجع'), 24), b, p_device);
end;
$$;
revoke all on function public.submit_match_message(text, text, text, text) from public;
grant execute on function public.submit_match_message(text, text, text, text) to anon, authenticated;
