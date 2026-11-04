import { useEffect } from 'react';
import { useAuth } from './auth';
import { TOURNAMENT } from './data/config';
import { useRoute } from './lib/route';
import { useTournament } from './store';
import { ErrorBox, Loading, EmptyState } from './components/StateViews';
import { Icon, type IconName } from './components/Icon';
import { Logo } from './components/Logo';
import { SponsorsFooter } from './components/Sponsors';
import { formatArabicDate } from './lib/stats';
import { MatchPage } from './pages/MatchPage';
import { MorePage } from './pages/MorePage';
import { PlayerPage } from './pages/PlayerPage';
import { QrPage } from './pages/QrPage';
import { SearchPage } from './pages/SearchPage';
import { AboutPage } from './pages/AboutPage';
import { AdminPage } from './pages/AdminPage';
import { FixturesPage } from './pages/FixturesPage';
import { BracketPage } from './pages/BracketPage';
import { GalleryPage } from './pages/GalleryPage';
import { GroupsPage } from './pages/GroupsPage';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { ScorersPage } from './pages/ScorersPage';
import { StandingsPage } from './pages/StandingsPage';
import { TeamDetailPage, TeamsPage } from './pages/TeamsPage';

const NAV: { key: string; label: string }[] = [
  { key: '', label: 'الرئيسية' },
  { key: 'fixtures', label: 'المباريات' },
  { key: 'groups', label: 'القرعة' },
  { key: 'standings', label: 'الترتيب' },
  { key: 'bracket', label: 'الإقصائيات' },
  { key: 'teams', label: 'الفرق' },
  { key: 'news', label: 'الأخبار' },
  { key: 'gallery', label: 'المعرض' },
  { key: 'scorers', label: 'الهدافون' },
  { key: 'about', label: 'عن الدوري' },
];

const BOTTOM_NAV: { key: string; label: string; icon: IconName }[] = [
  { key: '', label: 'الرئيسية', icon: 'home' },
  { key: 'fixtures', label: 'المباريات', icon: 'calendar' },
  { key: 'standings', label: 'الترتيب', icon: 'table' },
  { key: 'teams', label: 'الفرق', icon: 'users' },
  { key: 'more', label: 'المزيد', icon: 'more' },
];

/** صفحات تقع تحت زر "المزيد" في الموبايل */
const MORE_PAGES = ['more', 'bracket', 'groups', 'news', 'gallery', 'scorers', 'about', 'search', 'qr'];

const TITLES: Record<string, string> = {
  more: 'المزيد',
  '': 'الرئيسية',
  fixtures: 'المباريات والنتائج',
  groups: 'القرعة والمجموعات',
  standings: 'الترتيب',
  bracket: 'الأدوار الإقصائية',
  teams: 'الفرق واللاعبون',
  news: 'الأخبار',
  gallery: 'معرض الصور',
  scorers: 'الهدافون',
  about: 'عن الدوري',
  search: 'بحث',
  qr: 'رمز QR',
  match: 'المباراة',
  player: 'اللاعب',
};

function renderPage(segments: string[]) {
  const [page, id] = segments;
  switch (page ?? '') {
    case '':
      return <HomePage />;
    case 'fixtures':
      return <FixturesPage />;
    case 'groups':
      return <GroupsPage />;
    case 'standings':
      return <StandingsPage />;
    case 'bracket':
      return <BracketPage />;
    case 'teams':
      return id ? <TeamDetailPage teamId={id} /> : <TeamsPage />;
    case 'news':
      return <NewsPage />;
    case 'gallery':
      return <GalleryPage />;
    case 'scorers':
      return <ScorersPage />;
    case 'about':
      return <AboutPage />;
    case 'more':
      return <MorePage />;
    case 'match':
      return id ? <MatchPage matchId={id} /> : <EmptyState title="المباراة غير موجودة" />;
    case 'player':
      return id ? <PlayerPage playerId={id} /> : <EmptyState title="اللاعب غير موجود" />;
    case 'search':
      return <SearchPage />;
    case 'qr':
      return <QrPage />;
    default:
      return (
        <EmptyState title="الصفحة غير موجودة" hint="الرابط الذي فتحته غير صحيح. ارجع إلى الصفحة الرئيسية." />
      );
  }
}

export default function App() {
  const segments = useRoute();
  const auth = useAuth();
  const { state, offline, loading, error, reload } = useTournament();
  const current = segments[0] ?? '';
  const bottomActive = current === 'match' ? 'fixtures' : current === 'player' ? 'teams' : MORE_PAGES.includes(current) ? 'more' : current;

  useEffect(() => {
    if (current === 'admin') return; // لوحة الإدارة تضبط عنوانها بنفسها
    document.title = `${TITLES[current] ?? 'صفحة غير موجودة'} — ${TOURNAMENT.name}`;
  }, [current]);

  // لوحة الإدارة: منطقة منفصلة بدون قائمة الموقع العام
  if (current === 'admin') {
    return (
      <div className="theme-light">
        <a className="skip-link" href="#main">تخطَّ إلى المحتوى</a>
        <div className="demo-banner" role="note">
          {auth.enabled
            ? 'لوحة إدارة دوري عزم — للمخوّلين فقط.'
            : 'لوحة الإدارة — نسخة تجريبية: الدخول والتخزين هنا للعرض فقط وليسا آمنين للاستخدام الفعلي.'}
        </div>
        <main id="main" tabIndex={-1}>
          <div className="container">
            {loading && <Loading label="جارٍ تحميل لوحة الإدارة…" />}
            {!loading && error && <ErrorBox message={error} onRetry={reload} />}
            {!loading && !error && state && <AdminPage />}
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main">تخطَّ إلى المحتوى</a>
      <header className="site-header">
        <div className="container">
          <div className="brand-row">
            <a className="brand" href="#/" aria-label={`${TOURNAMENT.name} — الصفحة الرئيسية`}>
              <Logo className="brand-shield" />
              <span className="brand-text">
                <b>{TOURNAMENT.name}</b>
                <small>{TOURNAMENT.university}</small>
              </span>
            </a>
            <nav className="nav" aria-label="التنقل الرئيسي">
              {NAV.map((n) => (
                <a
                  key={n.key}
                  href={n.key ? `#/${n.key}` : '#/'}
                  aria-current={current === n.key ? 'page' : undefined}
                >
                  {n.label}
                </a>
              ))}
            </nav>
            <a className="icon-btn" href="#/search" aria-label="بحث"><Icon name="search" /></a>
            <a className="btn btn-primary nav-cta" href="#/groups">
              القرعة {formatArabicDate(TOURNAMENT.drawDate)}
            </a>
          </div>
        </div>
      </header>

      {offline && (
        <div className="offline-banner" role="status">
          {typeof navigator !== 'undefined' && navigator.onLine === false
            ? 'أنت غير متصل بالإنترنت — تُعرض آخر نسخة محفوظة من النتائج.'
            : 'تعذّر تحديث البيانات من الخادم الآن — تُعرض آخر نسخة محفوظة، ونعيد المحاولة تلقائياً. '}
          <button type="button" className="btn" onClick={reload}>إعادة المحاولة</button>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <div className="container">
          {loading && <Loading label="جارٍ تحميل بيانات الدوري…" />}
          {!loading && error && <ErrorBox message={error} onRetry={reload} />}
          {!loading && !error && state && renderPage(segments)}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container"><SponsorsFooter /></div>
        <div className="container row">
          <span>{TOURNAMENT.name} — {TOURNAMENT.university}</span>
          <a href="#/about">للتواصل ومعلومات الدوري</a>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="التنقل السريع">
        {BOTTOM_NAV.map((n) => (
          <a
            key={n.key}
            href={n.key ? `#/${n.key}` : '#/'}
            aria-current={bottomActive === n.key ? 'page' : undefined}
          >
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
