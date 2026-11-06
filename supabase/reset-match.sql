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
