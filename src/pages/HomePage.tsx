import { SCHEDULE, STATUS_LABELS, TOURNAMENT } from '../data/config';
import {
  computePlayerStats,
  computeStandings,
  featuredFirst,
  formatArabicDate,
  isDrawn,
  latestResults,
  playerById,
  sortMatches,
  sortedScorers,
  teamById,
} from '../lib/stats';
import { usePhotos } from '../lib/usePhotos';
import { useData } from '../store';
import { Countdown } from '../components/Countdown';
import { Icon, type IconName } from '../components/Icon';
import { MatchCard } from '../components/MatchCard';
import { PhotoGrid } from '../components/PhotoGrid';
import { PlayerCard } from '../components/PlayerCard';
import { EmptyState } from '../components/StateViews';
import { TeamBadge } from '../components/TeamBadge';
import { RollingBall } from '../components/RollingBall';
import { SponsorsSection } from '../components/Sponsors';

const QUICK_LINKS: { href: string; title: string; hint: string; icon: IconName }[] = [
  { href: '#/fixtures', title: 'المباريات والنتائج', hint: 'الجدول الكامل مع الفلاتر', icon: 'calendar' },
  { href: '#/standings', title: 'الترتيب', hint: 'جداول المجموعات الأربع', icon: 'table' },
  { href: '#/teams', title: 'الفرق واللاعبون', hint: '16 كلية وتشكيلاتها', icon: 'users' },
  { href: '#/scorers', title: 'الهدافون', hint: 'الأهداف وصناعة الأهداف', icon: 'trophy' },
];

const LIFE: { date: string; title: string; hint: string }[] = [
  { date: TOURNAMENT.drawDate, title: 'القرعة', hint: 'بحضور ممثلي الكليات' },
  { date: SCHEDULE.roundDates[1][0], title: 'الجولة الأولى', hint: 'صافرة البداية' },
  { date: SCHEDULE.roundDates[2][0], title: 'الجولة الثانية', hint: 'تتصاعد المنافسة' },
  { date: SCHEDULE.roundDates[3][0], title: 'الجولة الثالثة', hint: 'حسم المتأهلين' },
];

function countdownTarget(): { date: string; label: string } | null {
  const at = (d: string) => new Date(`${d}T00:00:00`).getTime();
  const now = Date.now();
  if (now < at(TOURNAMENT.drawDate)) return { date: TOURNAMENT.drawDate, label: 'القرعة بعد' };
  if (now < at(TOURNAMENT.startDate)) return { date: TOURNAMENT.startDate, label: 'صافرة البداية بعد' };
  return null;
}

export function HomePage() {
  const state = useData();
  const { photos: latestPhotos } = usePhotos({ limit: 6 });
  const nameParts = TOURNAMENT.name.split(' ');
  const wordMain = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];
  const wordPre = nameParts.length > 1 ? nameParts[0] : '';
  const latest = latestResults(state, 3);
  const upcoming = sortMatches(state.matches).filter((m) => m.status !== 'completed').slice(0, 3);
  const news = [...state.news].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const target = countdownTarget();
  const drawn = isDrawn(state);
  const hour = new Date().getHours();
  const isNight = hour >= 18 || hour < 6;

  const start = new Date(`${TOURNAMENT.startDate}T12:00:00`);
  const startMonth = start.toLocaleDateString('ar-EG-u-nu-latn', { month: 'long' });

  const top5 = drawn
    ? Object.values(computeStandings(state))
        .flat()
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
        .slice(0, 5)
    : [];
  const stars = sortedScorers(computePlayerStats(state)).slice(0, 4);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-photo" src={`${import.meta.env.BASE_URL}images/field-aerial.jpg`} alt="" width={1280} height={960} decoding="async" fetchPriority="high" aria-hidden="true" />
        <div className="hero-date" aria-hidden="true">
          <b>{start.getDate()}</b>
          <span>{startMonth}</span>
          <small>موسم {start.getFullYear()}</small>
        </div>
        <span className="hero-eyebrow">الدوري الجامعي {start.getFullYear()} · {TOURNAMENT.university}</span>
        <h1 id="hero-title" className="wordmark" aria-label={TOURNAMENT.name}>
          {wordPre && <span className="w-pre" aria-hidden="true">{wordPre}</span>}
          <span className="w-main" aria-hidden="true">{wordMain}</span>
        </h1>
        <p className="hero-slogan">
          المنافسة تبدأ هنا.
          <span>من الكلية إلى منصة التتويج.</span>
        </p>
        <span className="status-pill">
          <span className="dot" aria-hidden="true" /> حالة الدوري: {STATUS_LABELS[TOURNAMENT.status]}
        </span>
        <div className="meta">
          <span><Icon name="calendar" /> القرعة: {formatArabicDate(TOURNAMENT.drawDate)}</span>
          <span><Icon name="calendar" /> صافرة البداية: {formatArabicDate(TOURNAMENT.startDate)}</span>
          <span><Icon name="pin" /> الميدان: {TOURNAMENT.venueShort}</span>
        </div>
        {target && <Countdown target={target.date} label={target.label} />}
        <div className="actions">
          <a className="btn btn-primary" href="#/fixtures">المباريات</a>
          <a className="btn btn-ghost" href="#/teams">الفرق المشاركة</a>
        </div>
        <RollingBall />
      </section>

      <section className="section" aria-labelledby="next-title">
        <div className="section-title">
          <h2 id="next-title">المباريات القادمة</h2>
          <a className="link-more" href="#/fixtures">كل المباريات</a>
        </div>
        {upcoming.length > 0 ? (
          <div className="match-list">
            {upcoming.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        ) : (
          <EmptyState
            title={latest.length > 0 ? 'لا توجد مباريات قادمة الآن' : 'يُعلن الجدول بعد القرعة'}
            hint={latest.length > 0 ? 'تابع آخر النتائج أدناه.' : `تُقام القرعة يوم ${formatArabicDate(TOURNAMENT.drawDate)} بحضور ممثلي الكليات.`}
          />
        )}
      </section>

      <section className="section" aria-labelledby="top5-title">
        <div className="section-title">
          <h2 id="top5-title">ترتيب الدوري</h2>
          <a className="link-more" href="#/standings">الترتيب الكامل</a>
        </div>
        {top5.length > 0 ? (
          <div className="table-wrap">
            <table className="mini-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col" className="team-cell">الفريق</th>
                  <th scope="col">لعب</th>
                  <th scope="col">+/−</th>
                  <th scope="col">نقاط</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((r, i) => {
                  const team = teamById(state, r.teamId);
                  return (
                    <tr key={r.teamId}>
                      <td className="rank">{i + 1}</td>
                      <td className="team-cell">
                        <a className="team-line" href={`#/teams/${r.teamId}`}>
                          <TeamBadge team={team} size={26} />
                          {team?.nickname}
                        </a>
                      </td>
                      <td>{r.played}</td>
                      <td dir="ltr">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                      <td className="pts">{r.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="يظهر الترتيب بعد القرعة" hint="تُحسب النقاط تلقائياً من نتائج المباريات المنتهية." />
        )}
      </section>

      <div className="stats-strip" aria-label="إحصائيات البطولة">
        <div className="card stat"><b>{state.teams.length}</b><span>كلية</span></div>
        <div className="card stat"><b>{state.players.length}</b><span>لاعب</span></div>
        <div className="card stat"><b>{state.matches.length}</b><span>مباراة</span></div>
        <div className="card stat"><b>{state.events.length}</b><span>هدف</span></div>
      </div>

      {latest.length > 0 && (
        <section className="section" aria-labelledby="latest-title">
          <div className="section-title">
            <h2 id="latest-title">آخر النتائج</h2>
            <a className="link-more" href="#/fixtures">المزيد</a>
          </div>
          <div className="match-list">
            {latest.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      <section className="section league-life" aria-labelledby="life-title">
        {isNight && <img className="league-floodlight" src={`${import.meta.env.BASE_URL}images/floodlight-night.jpg`} alt="" aria-hidden="true" />}
        <div className="section-title"><h2 id="life-title">حياة الدوري</h2></div>
        <ol className="timeline">
          {LIFE.map((l) => (
            <li key={l.title}>
              <span className="tl-date">{formatArabicDate(l.date)}</span>
              <strong>{l.title}</strong>
              <small>{l.hint}</small>
            </li>
          ))}
        </ol>
      </section>

      {latestPhotos.length > 0 && (
        <section className="section" aria-labelledby="photos-title">
          <div className="section-title">
            <h2 id="photos-title">لقطات من الملاعب</h2>
            <a className="link-more" href="#/gallery">كل الصور</a>
          </div>
          <PhotoGrid photos={latestPhotos} />
        </section>
      )}

      <section className="section" aria-labelledby="news-title">
        <div className="section-title">
          <h2 id="news-title">آخر الأخبار</h2>
          <a className="link-more" href="#/news">كل الأخبار</a>
        </div>
        <div className="news-list">
          {news.map((n) => (
            <article key={n.id} className="card news-item">
              {n.image && <img className="news-img" src={n.image.startsWith('http') ? n.image : `${import.meta.env.BASE_URL}${n.image}`} alt="" loading="lazy" />}
              <div className="meta">
                <span className="chip">{n.tag}</span>
                <span>{formatArabicDate(n.date)}</span>
              </div>
              <h3>{n.title}</h3>
              <p>{n.summary}</p>
            </article>
          ))}
        </div>
      </section>

      {stars.length > 0 && (
        <section className="section" aria-labelledby="stars-title">
          <div className="section-title">
            <h2 id="stars-title">أبرز اللاعبين</h2>
            <a className="link-more" href="#/scorers">الهدافون</a>
          </div>
          <div className="players-grid">
            {stars.map((s) => {
              const p = playerById(state, s.playerId);
              return p ? <PlayerCard key={p.id} player={p} team={teamById(state, p.teamId)} goals={s.goals} assists={s.assists} /> : null;
            })}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="colleges-title">
        <div className="section-title">
          <h2 id="colleges-title">الكليات المشاركة</h2>
          <a className="link-more" href="#/teams">عرض الكل</a>
        </div>
        <div className="college-grid">
          {featuredFirst(state.teams).map((t) => (
            <a key={t.id} className="college-chip" href={`#/teams/${t.id}`}>
              <TeamBadge team={t} size={34} />
              <span>{t.nickname}</span>
            </a>
          ))}
        </div>
      </section>

      <SponsorsSection />

      <section className="section" aria-labelledby="links-title">
        <div className="section-title"><h2 id="links-title">تصفّح الدوري</h2></div>
        <div className="quick-links">
          {QUICK_LINKS.map((l) => (
            <a key={l.href} className="quick-link" href={l.href}>
              <span className="qi"><Icon name={l.icon} /></span>
              <b>{l.title}</b>
              <small>{l.hint}</small>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
