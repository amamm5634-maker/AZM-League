import { useState } from 'react';
import { computePlayerStats, playerById, sortedAssisters, sortedScorers, teamById } from '../lib/stats';
import { useData } from '../store';
import { EmptyState, PageHead } from '../components/StateViews';
import { TeamBadge } from '../components/TeamBadge';

type Tab = 'goals' | 'assists';

export function ScorersPage() {
  const state = useData();
  const [tab, setTab] = useState<Tab>('goals');
  const stats = computePlayerStats(state);
  const list = (tab === 'goals' ? sortedScorers(stats) : sortedAssisters(stats)).slice(0, 20);

  return (
    <>
      <PageHead
        title="الهدافون وصناع الأهداف"
        subtitle="تتحدث القوائم تلقائياً مع كل هدف يسجّله المشرف في لوحة الإدارة."
      />

      <div className="tabs" role="tablist" aria-label="نوع الترتيب">
        <button type="button" role="tab" id="tab-goals" aria-selected={tab === 'goals'} aria-controls="scorers-panel" onClick={() => setTab('goals')}>
          الهدافون
        </button>
        <button type="button" role="tab" id="tab-assists" aria-selected={tab === 'assists'} aria-controls="scorers-panel" onClick={() => setTab('assists')}>
          صناع الأهداف
        </button>
      </div>

      <div id="scorers-panel" role="tabpanel" aria-labelledby={tab === 'goals' ? 'tab-goals' : 'tab-assists'}>
        {list.length === 0 ? (
          <EmptyState title="لا توجد إحصاءات بعد" hint="ستظهر هنا فور تسجيل أول هدف." />
        ) : (
          <>
          {list.length >= 3 && (
            <div className="podium" aria-label="المراكز الثلاثة الأولى">
              {[1, 0, 2].map((i) => {
                const s = list[i];
                const p = playerById(state, s.playerId);
                const team = teamById(state, s.teamId);
                return (
                  <div key={s.playerId} className={`pod pod-${i + 1}`}>
                    <TeamBadge team={team} size={44} />
                    <b>{p?.name}</b>
                    <small>{team?.nickname}</small>
                    <span className="pv">{tab === 'goals' ? s.goals : s.assists}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col" className="team-cell">اللاعب</th>
                  <th scope="col">الفريق</th>
                  <th scope="col">أهداف</th>
                  <th scope="col">صناعة</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => {
                  const p = playerById(state, s.playerId);
                  const team = teamById(state, s.teamId);
                  return (
                    <tr key={s.playerId}>
                      <td className="rank">{i + 1}</td>
                      <td className="team-cell"><strong>{p?.name}</strong></td>
                      <td>
                        <a className="team-line" href={`#/teams/${s.teamId}`}>
                          <TeamBadge team={team} size={26} />
                          {team?.nickname}
                        </a>
                      </td>
                      <td className={tab === 'goals' ? 'num-hi' : undefined}>{s.goals}</td>
                      <td className={tab === 'assists' ? 'num-hi' : undefined}>{s.assists}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </>
  );
}
