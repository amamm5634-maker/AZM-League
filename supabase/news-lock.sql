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
