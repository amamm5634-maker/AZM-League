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
  select choice, count(*)::bigint from public.match_predictions where match_id = p_match group by choice;
$$;

revoke all on function public.submit_prediction(text, text, text), public.prediction_counts(text) from public;
grant execute on function public.submit_prediction(text, text, text), public.prediction_counts(text) to anon, authenticated;
