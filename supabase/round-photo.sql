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
