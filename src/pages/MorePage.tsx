import { Icon, type IconName } from '../components/Icon';
import { InstallButton } from '../components/InstallButton';
import { PageHead } from '../components/StateViews';

const ITEMS: { href: string; title: string; hint: string; icon: IconName }[] = [
  { href: '#/groups', title: 'القرعة والمجموعات', hint: 'نتيجة القرعة وتوزيع الكليات', icon: 'shield' },
  { href: '#/bracket', title: 'الأدوار الإقصائية', hint: 'شجرة المتأهلين إلى النهائي', icon: 'trophy' },
  { href: '#/gallery', title: 'معرض الصور', hint: 'لقطات المباريات بعدسة المصوّرين', icon: 'image' },
  { href: '#/scorers', title: 'الهدافون', hint: 'الأهداف وصناعة الأهداف', icon: 'trophy' },
  { href: '#/news', title: 'الأخبار', hint: 'إعلانات اللجنة المنظمة', icon: 'info' },
  { href: '#/search', title: 'بحث', hint: 'ابحث عن كلية أو لاعب', icon: 'search' },
  { href: '#/qr', title: 'رمز QR للموقع', hint: 'للطباعة على الملصقات', icon: 'info' },
  { href: '#/about', title: 'عن الدوري', hint: 'النظام والميدان والتواصل', icon: 'ball' },
];

export function MorePage() {
  return (
    <>
      <PageHead title="المزيد" subtitle="باقي أقسام الدوري." />
      <InstallButton />
      <div className="quick-links">
        {ITEMS.map((i) => (
          <a key={i.href} className="quick-link" href={i.href}>
            <span className="qi"><Icon name={i.icon} /></span>
            <b>{i.title}</b>
            <small>{i.hint}</small>
          </a>
        ))}
      </div>
    </>
  );
}
