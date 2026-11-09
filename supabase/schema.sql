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

-- ---------- 6و) توقعات المباريات ----------
-- توقعات المباريات: صوت واحد لكل جهاز في كل مباراة (تسلية، ليست مسابقة بجوائز). شغّله مرة واحدة.
create table if not exists public.match_predictions (
  match_id text not null check (match_id ~ '^m[0-9]{1,4}$'),
  device text not null check (char_length(device) between 8 and 64),
  choice text not null check (choice in ('home', 'draw', 'away')),
  created_at timestamptz not null default now(),
  primary key (match_id, device)
);
alter table public.match_predictions enable row level security;
-- لا سياسات ولا صلاحيات مباشرة للزوار: كل شيء عبر الدالتين أدناه
revoke all on public.match_predictions from anon, authenticated;

-- تسجيل توقع (مرة واحدة لكل جهاز في المباراة). يُرفض إن بدأت المباراة حسب جدول النتائج.
create or replace function public.submit_prediction(p_match text, p_choice text, p_device text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_match is null or p_match !~ '^m[0-9]{1,4}$' then
    raise exception 'invalid_match' using errcode = '22023';
  end if;
  if p_choice is null or p_choice not in ('home', 'draw', 'away') then
    raise exception 'invalid_choice' using errcode = '22023';
  end if;
  if p_device is null or char_length(p_device) < 8 or char_length(p_device) > 64 then
    raise exception 'invalid_device' using errcode = '22023';
  end if;
  if exists (select 1 from public.match_state where match_id = p_match and status <> 'scheduled') then
    raise exception 'closed' using errcode = '55000';
  end if;
  -- سقف لكل مباراة: يحمي المساحة المجانية من الإغراق ببيانات وهمية
  if (select count(*) from public.match_predictions where match_id = p_match) >= 10000 then
    raise exception 'full' using errcode = '54000';
  end if;
  insert into public.match_predictions (match_id, device, choice) values (p_match, p_device, p_choice)
  on conflict (match_id, device) do nothing;
  if not found then
    raise exception 'already_voted' using errcode = '23505';
  end if;
end;
$$;

-- أعداد التوقعات لمباراة (بدون أي بيانات عن الأجهزة)
create or replace function public.prediction_counts(p_match text)
returns table (choice text, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.choice, count(*)::bigint from public.match_predictions p where p.match_id = p_match group by p.choice;
$$;

revoke all on function public.submit_prediction(text, text, text), public.prediction_counts(text) from public;
grant execute on function public.submit_prediction(text, text, text), public.prediction_counts(text) to anon, authenticated;

-- ---------- التشكيلات (match_lineups) ----------
-- التشكيلات الأساسية للمباريات: المسجّل أو الأدمن يختار 11 لاعباً من قائمة الفريق.
-- شغّله مرة واحدة في SQL Editor (آمن للتكرار). الباقي من قائمة الفريق يُعتبر بدلاء تلقائياً.
create table if not exists public.match_lineups (
  match_id text not null check (match_id ~ '^m[0-9]{1,4}$'),
  team_id text not null check (team_id ~ '^t[0-9]{2}$'),
  player_ids text[] not null check (cardinality(player_ids) = 11),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (match_id, team_id)
);
alter table public.match_lineups enable row level security;

-- الجميع يقرأ التشكيلات (تظهر في صفحة المباراة)
drop policy if exists "public read lineups" on public.match_lineups;
create policy "public read lineups" on public.match_lineups
  for select to anon, authenticated using (true);
grant select on public.match_lineups to anon, authenticated;
-- لا كتابة مباشرة: الحفظ عبر الدالة فقط (تتحقق من الدور والقفل)

-- حفظ تشكيلة: للأدمن والمسجّل. المسجّل لا يعدّل بعد بدء المباراة (حالتها ليست scheduled)، والأدمن يعدّل دائماً.
create or replace function public.save_lineup(p_match text, p_team text, p_players text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := public.has_role(array['admin']);
begin
  if not public.has_role(array['admin', 'scorer']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_match is null or p_match !~ '^m[0-9]{1,4}$' then
    raise exception 'invalid_match' using errcode = '22023';
  end if;
  if p_team is null or p_team !~ '^t[0-9]{2}$' then
    raise exception 'invalid_team' using errcode = '22023';
  end if;
  if p_players is null or cardinality(p_players) <> 11
     or (select count(distinct x) from unnest(p_players) x) <> 11 then
    raise exception 'invalid_players' using errcode = '22023';
  end if;
  -- كل لاعب لازم يكون من هذا الفريق: t09-p03 مثلاً
  if exists (select 1 from unnest(p_players) x where x is null or x !~ ('^' || p_team || '-p[0-9]{2}$')) then
    raise exception 'player_not_in_team' using errcode = '22023';
  end if;
  if not is_admin and exists (select 1 from public.match_state where match_id = p_match and status <> 'scheduled') then
    raise exception 'locked' using errcode = '55000';
  end if;
  insert into public.match_lineups (match_id, team_id, player_ids, updated_by, updated_at)
  values (p_match, p_team, p_players, auth.uid(), now())
  on conflict (match_id, team_id) do update
    set player_ids = excluded.player_ids, updated_by = auth.uid(), updated_at = now();
end;
$$;

-- حذف تشكيلة (للتصحيح): نفس الصلاحيات والقفل
create or replace function public.clear_lineup(p_match text, p_team text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(array['admin', 'scorer']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not public.has_role(array['admin']) and exists (select 1 from public.match_state where match_id = p_match and status <> 'scheduled') then
    raise exception 'locked' using errcode = '55000';
  end if;
  delete from public.match_lineups where match_id = p_match and team_id = p_team;
end;
$$;

revoke all on function public.save_lineup(text, text, text[]), public.clear_lineup(text, text) from public;
grant execute on function public.save_lineup(text, text, text[]), public.clear_lineup(text, text) to authenticated;
-- إعادة مباراة لحالتها الأولى (للأدمن فقط). شغّله مرة واحدة في SQL Editor (آمن للتكرار).
create or replace function public.reset_match(p_match text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(array['admin']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_match is null or p_match !~ '^m[0-9]{1,4}$' then
    raise exception 'invalid_match' using errcode = '22023';
  end if;
  delete from public.goal_events where match_id = p_match;
  insert into public.match_state (match_id, home_score, away_score, status, motm_player_id, updated_at)
  values (p_match, 0, 0, 'scheduled', null, now())
  on conflict (match_id) do update
    set home_score = 0, away_score = 0, status = 'scheduled', motm_player_id = null, updated_at = now();
end;
$$;
revoke all on function public.reset_match(text) from public, anon;
grant execute on function public.reset_match(text) to authenticated;

-- ---------- البطاقات ----------
-- البطاقات (أصفر/أحمر) مع الدقيقة. شغّله مرة واحدة في SQL Editor (آمن للتكرار).
create table if not exists public.match_cards (
  id uuid primary key default gen_random_uuid(),
  match_id text not null check (match_id ~ '^m[0-9]{1,4}$'),
  team_id text not null check (team_id ~ '^t[0-9]{2}$'),
  player_id text not null check (player_id ~ '^t[0-9]{2}-p[0-9]{2}$'),
  kind text not null check (kind in ('yellow', 'red')),
  minute integer check (minute between 1 and 120),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists match_cards_match_idx on public.match_cards (match_id);
alter table public.match_cards enable row level security;

drop policy if exists "public read match_cards" on public.match_cards;
create policy "public read match_cards" on public.match_cards for select to anon, authenticated using (true);

drop policy if exists "scorers write match_cards" on public.match_cards;
create policy "scorers write match_cards" on public.match_cards
  for all to authenticated
  using (public.has_role(array['admin', 'scorer']))
  with check (public.has_role(array['admin', 'scorer']));

grant select on public.match_cards to anon, authenticated;
grant insert, update, delete on public.match_cards to authenticated;

-- تحديث دالة إعادة المباراة لتمسح بطاقاتها أيضاً
create or replace function public.reset_match(p_match text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(array['admin']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_match is null or p_match !~ '^m[0-9]{1,4}$' then
    raise exception 'invalid_match' using errcode = '22023';
  end if;
  delete from public.goal_events where match_id = p_match;
  delete from public.match_cards where match_id = p_match;
  insert into public.match_state (match_id, home_score, away_score, status, motm_player_id, updated_at)
  values (p_match, 0, 0, 'scheduled', null, now())
  on conflict (match_id) do update
    set home_score = 0, away_score = 0, status = 'scheduled', motm_player_id = null, updated_at = now();
end;
$$;
revoke all on function public.reset_match(text) from public, anon;
grant execute on function public.reset_match(text) to authenticated;

-- ---------- التبديلات (شغّل cards.sql قبله) ----------
-- التبديلات أثناء المباراة. شغّله مرة واحدة في SQL Editor (آمن للتكرار).
-- قواعد التبديل (الحد الأقصى 5، من خرج لا يعود...) يتحقق منها الموقع؛ القاعدة تضمن الصلاحيات وصحة الشكل فقط.
create table if not exists public.match_subs (
  id uuid primary key default gen_random_uuid(),
  match_id text not null check (match_id ~ '^m[0-9]{1,4}$'),
  team_id text not null check (team_id ~ '^t[0-9]{2}$'),
  out_id text not null check (out_id ~ '^t[0-9]{2}-p[0-9]{2}$'),
  in_id text not null check (in_id ~ '^t[0-9]{2}-p[0-9]{2}$' and in_id <> out_id),
  minute integer check (minute between 1 and 120),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists match_subs_match_idx on public.match_subs (match_id);
alter table public.match_subs enable row level security;

drop policy if exists "public read match_subs" on public.match_subs;
create policy "public read match_subs" on public.match_subs for select to anon, authenticated using (true);

drop policy if exists "scorers write match_subs" on public.match_subs;
create policy "scorers write match_subs" on public.match_subs
  for all to authenticated
  using (public.has_role(array['admin', 'scorer']))
  with check (public.has_role(array['admin', 'scorer']));

grant select on public.match_subs to anon, authenticated;
grant insert, update, delete on public.match_subs to authenticated;

-- تحديث إعادة المباراة لتمسح التبديلات والبطاقات
create or replace function public.reset_match(p_match text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(array['admin']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_match is null or p_match !~ '^m[0-9]{1,4}$' then
    raise exception 'invalid_match' using errcode = '22023';
  end if;
  delete from public.goal_events where match_id = p_match;
  delete from public.match_cards where match_id = p_match;
  delete from public.match_subs where match_id = p_match;
  insert into public.match_state (match_id, home_score, away_score, status, motm_player_id, updated_at)
  values (p_match, 0, 0, 'scheduled', null, now())
  on conflict (match_id) do update
    set home_score = 0, away_score = 0, status = 'scheduled', motm_player_id = null, updated_at = now();
end;
$$;
revoke all on function public.reset_match(text) from public, anon;
grant execute on function public.reset_match(text) to authenticated;


-- ===== مراكز اللاعبين الخاصة بالمباراة (lineup-positions.sql): في النهاية دائماً كي تحلّ دالة save_lineup الجديدة محل القديمة =====
-- مركز مختلف للاعب في مباراة معيّنة (مثل جناح يلعب وسطاً الليلة).
-- شغّله مرة واحدة في SQL Editor بعد lineups.sql (آمن للتكرار).
-- لا يغيّر مركز اللاعب الأصلي في قائمة الفريق؛ يُخزَّن فقط ما يخالف المعتاد داخل تشكيلة المباراة.

alter table public.match_lineups
  add column if not exists positions jsonb not null default '{}'::jsonb;

-- نحذف الصيغة القديمة (3 معاملات) كي لا يلتبس الاستدعاء بين دالتين؛ الصيغة الجديدة تقبل 3 معاملات أيضاً (الرابع اختياري)
drop function if exists public.save_lineup(text, text, text[]);

create or replace function public.save_lineup(p_match text, p_team text, p_players text[], p_positions jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := public.has_role(array['admin']);
  pos jsonb := coalesce(p_positions, '{}'::jsonb);
begin
  if not public.has_role(array['admin', 'scorer']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_match is null or p_match !~ '^m[0-9]{1,4}$' then
    raise exception 'invalid_match' using errcode = '22023';
  end if;
  if p_team is null or p_team !~ '^t[0-9]{2}$' then
    raise exception 'invalid_team' using errcode = '22023';
  end if;
  if p_players is null or cardinality(p_players) <> 11
     or (select count(distinct x) from unnest(p_players) x) <> 11 then
    raise exception 'invalid_players' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_players) x where x is null or x !~ ('^' || p_team || '-p[0-9]{2}$')) then
    raise exception 'player_not_in_team' using errcode = '22023';
  end if;
  -- المراكز المخصصة: كائن مفاتيحه من لاعبي التشكيلة وقيمه مراكز معروفة فقط
  if jsonb_typeof(pos) <> 'object'
     or exists (select 1 from jsonb_each_text(pos) e where e.key <> all (p_players))
     or exists (select 1 from jsonb_each_text(pos) e where e.value not in ('حارس', 'مدافع', 'وسط', 'جناح', 'مهاجم')) then
    raise exception 'invalid_positions' using errcode = '22023';
  end if;
  if not is_admin and exists (select 1 from public.match_state where match_id = p_match and status <> 'scheduled') then
    raise exception 'locked' using errcode = '55000';
  end if;
  insert into public.match_lineups (match_id, team_id, player_ids, positions, updated_by, updated_at)
  values (p_match, p_team, p_players, pos, auth.uid(), now())
  on conflict (match_id, team_id) do update
    set player_ids = excluded.player_ids, positions = excluded.positions, updated_by = auth.uid(), updated_at = now();
end;
$$;

revoke all on function public.save_lineup(text, text, text[], jsonb) from public;
grant execute on function public.save_lineup(text, text, text[], jsonb) to authenticated;


-- ===== طريقة اللعب (lineup-formation.sql): في النهاية دائماً =====
-- طريقة اللعب المختارة للتشكيلة (مثل 4-3-3). شغّله مرة واحدة في SQL Editor بعد lineups.sql و lineup-positions.sql (آمن للتكرار).
-- الغائب = "تلقائي": تُحسب الطريقة من مراكز اللاعبين.

alter table public.match_lineups
  add column if not exists formation text;

-- نحذف صيغة 4 معاملات القديمة كي لا يلتبس الاستدعاء؛ الجديدة تقبل 3 أو 4 أو 5 معاملات (الأخيران اختياريان)
drop function if exists public.save_lineup(text, text, text[], jsonb);
drop function if exists public.save_lineup(text, text, text[]);

create or replace function public.save_lineup(
  p_match text, p_team text, p_players text[],
  p_positions jsonb default '{}'::jsonb,
  p_formation text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := public.has_role(array['admin']);
  pos jsonb := coalesce(p_positions, '{}'::jsonb);
begin
  if not public.has_role(array['admin', 'scorer']) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_match is null or p_match !~ '^m[0-9]{1,4}$' then
    raise exception 'invalid_match' using errcode = '22023';
  end if;
  if p_team is null or p_team !~ '^t[0-9]{2}$' then
    raise exception 'invalid_team' using errcode = '22023';
  end if;
  if p_players is null or cardinality(p_players) <> 11
     or (select count(distinct x) from unnest(p_players) x) <> 11 then
    raise exception 'invalid_players' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_players) x where x is null or x !~ ('^' || p_team || '-p[0-9]{2}$')) then
    raise exception 'player_not_in_team' using errcode = '22023';
  end if;
  if jsonb_typeof(pos) <> 'object'
     or exists (select 1 from jsonb_each_text(pos) e where e.key <> all (p_players))
     or exists (select 1 from jsonb_each_text(pos) e where e.value not in ('حارس', 'مدافع', 'وسط', 'جناح', 'مهاجم')) then
    raise exception 'invalid_positions' using errcode = '22023';
  end if;
  -- طريقة اللعب: 2 إلى 4 أرقام بين 1 و9 ومجموعها 10 (لاعبو الميدان)، أو فارغة
  if p_formation is not null and (
       p_formation !~ '^[1-9](-[1-9]){1,3}$'
       or (select sum(x::int) from unnest(string_to_array(p_formation, '-')) x) <> 10) then
    raise exception 'invalid_formation' using errcode = '22023';
  end if;
  if not is_admin and exists (select 1 from public.match_state where match_id = p_match and status <> 'scheduled') then
    raise exception 'locked' using errcode = '55000';
  end if;
  insert into public.match_lineups (match_id, team_id, player_ids, positions, formation, updated_by, updated_at)
  values (p_match, p_team, p_players, pos, p_formation, auth.uid(), now())
  on conflict (match_id, team_id) do update
    set player_ids = excluded.player_ids, positions = excluded.positions, formation = excluded.formation,
        updated_by = auth.uid(), updated_at = now();
end;
$$;

revoke all on function public.save_lineup(text, text, text[], jsonb, text) from public;
grant execute on function public.save_lineup(text, text, text[], jsonb, text) to authenticated;


-- ===== تثبيت الأخبار (news-lock.sql): في النهاية دائماً =====
-- تثبيت الأخبار (حماية): الخبر المثبّت لا يعدّله ولا يحذفه إلا الأدمن. محرر الأخبار يضيف وينشر ويحذف غير المثبّت فقط.
-- شغّله مرة واحدة في SQL Editor (آمن للتكرار). عند أول تشغيل يثبّت كل الأخبار الموجودة وقتها؛ ولا يعيد تثبيتها في المرات التالية.

do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'news' and column_name = 'locked') then
    alter table public.news add column locked boolean not null default false;
    update public.news set locked = true;
  end if;
end $$;

-- نستبدل السياسة العامة القديمة بسياسات منفصلة (إضافة / تعديل / حذف)
drop policy if exists "editors write news" on public.news;
drop policy if exists "news insert" on public.news;
drop policy if exists "news update" on public.news;
drop policy if exists "news delete" on public.news;

-- الإضافة: الأدمن، أو المحرر بشرط ألا يثبّت الخبر بنفسه
create policy "news insert" on public.news
  for insert to authenticated
  with check (public.has_role(array['admin']) or (public.has_role(array['editor']) and locked = false));

-- التعديل: الأدمن دائماً، والمحرر فقط على غير المثبّت، ولا يقدر يثبّته
create policy "news update" on public.news
  for update to authenticated
  using (public.has_role(array['admin']) or (public.has_role(array['editor']) and locked = false))
  with check (public.has_role(array['admin']) or (public.has_role(array['editor']) and locked = false));

-- الحذف: الأدمن دائماً، والمحرر فقط على غير المثبّت
create policy "news delete" on public.news
  for delete to authenticated
  using (public.has_role(array['admin']) or (public.has_role(array['editor']) and locked = false));
