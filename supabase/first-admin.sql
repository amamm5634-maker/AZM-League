-- يجعل حسابك أدمن. نفّذه مرة واحدة في Supabase → SQL Editor بعد:
--   1) تشغيل schema.sql كاملاً
--   2) إنشاء حسابك من Authentication → Users → Add user (مع تفعيل Auto Confirm User)
-- استبدل البريد والاسم بالقيم الحقيقية (أبقِ علامات الاقتباس).
insert into public.staff (user_id, role, name)
select id, 'admin', 'اسمك هنا'
from auth.users
where lower(email) = lower('ضع-بريد-الأدمن-هنا@example.com')
on conflict (user_id) do update set role = 'admin';

-- تحقق: يجب أن يظهر صف واحد بدور admin
select u.email, s.role, s.name from public.staff s join auth.users u on u.id = s.user_id;
