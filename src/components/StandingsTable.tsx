import type { GroupId } from '../types';
import { GROUP_LABELS } from '../data/config';
import { computeStandings, teamById } from '../lib/stats';
import { useData } from '../store';
import { TeamBadge } from './TeamBadge';

export function StandingsTable({ group }: { group: GroupId }) {
  const state = useData();
  const rows = computeStandings(state)[group];

  return (
    <section aria-labelledby={`st-${group}`}>
      <h2 id={`st-${group}`} className="section-title" style={{ fontSize: '1.1rem', color: 'var(--head)' }}>
        {GROUP_LABELS[group]}
      </h2>
      <div className="table-wrap">
        <table>
          <caption className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            جدول ترتيب {GROUP_LABELS[group]}
          </caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col" className="team-cell">الفريق</th>
              <th scope="col" title="لعب">لعب</th>
              <th scope="col" title="فوز">ف</th>
              <th scope="col" title="تعادل">ت</th>
              <th scope="col" title="خسارة">خ</th>
              <th scope="col" title="الأهداف له">له</th>
              <th scope="col" title="الأهداف عليه">عليه</th>
              <th scope="col" title="فارق الأهداف">+/−</th>
              <th scope="col" title="النقاط">نقاط</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const team = teamById(state, r.teamId);
              return (
                <tr key={r.teamId} className={i < 2 ? 'qualify' : undefined}>
                  <td className="rank">{i + 1}</td>
                  <td className="team-cell">
                    <a className="team-line" href={`#/teams/${r.teamId}`}>
                      <TeamBadge team={team} size={28} />
                      {team?.name}
                    </a>
                  </td>
                  <td>{r.played}</td>
                  <td>{r.won}</td>
                  <td>{r.drawn}</td>
                  <td>{r.lost}</td>
                  <td>{r.gf}</td>
                  <td>{r.ga}</td>
                  <td dir="ltr">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                  <td className="pts">{r.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
