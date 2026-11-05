import { GROUP_IDS, GROUP_LABELS, TOURNAMENT } from '../data/config';
import { formatArabicDate, isDrawn } from '../lib/stats';
import { useData } from '../store';
import { PageHead } from '../components/StateViews';
import { TeamBadge } from '../components/TeamBadge';

export function GroupsPage() {
  const state = useData();

  if (!isDrawn(state)) {
    return (
      <>
        <PageHead title="القرعة والمجموعات" subtitle="16 فريقاً في 4 مجموعات، في كل مجموعة 4 فرق." />
        <p className="notice" role="note">
          تُقام القرعة يوم {formatArabicDate(TOURNAMENT.drawDate)} بحضور ممثلي الكليات، وتظهر المجموعات هنا فور إعلانها.
        </p>
        <h2 className="date-head" style={{ marginTop: 20 }}>الكليات المشاركة في القرعة</h2>
        <div className="college-grid">
          {state.teams.map((t) => (
            <a key={t.id} className="college-chip" href={`#/teams/${t.id}`}>
              <TeamBadge team={t} size={34} />
              <span>{t.nickname}</span>
            </a>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead title="القرعة والمجموعات" subtitle="نتيجة القرعة: 4 مجموعات، في كل مجموعة 4 فرق." />
      <div className="groups-grid">
        {GROUP_IDS.map((g) => (
          <section key={g} className="card group-card" aria-labelledby={`g-${g}`}>
            <h3 id={`g-${g}`}>{GROUP_LABELS[g]}</h3>
            <ul>
              {state.teams.filter((t) => t.group === g).map((t) => (
                <li key={t.id}>
                  <a href={`#/teams/${t.id}`}>
                    <TeamBadge team={t} size={38} />
                    <span>{t.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
