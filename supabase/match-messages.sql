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
