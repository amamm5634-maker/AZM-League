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
