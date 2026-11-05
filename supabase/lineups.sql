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
