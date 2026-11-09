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
