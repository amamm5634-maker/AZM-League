import { useState } from 'react';
import { teamById } from '../lib/stats';
import { useData } from '../store';
import { EmptyState, PageHead } from '../components/StateViews';
import { TeamBadge } from '../components/TeamBadge';

/** توحيد الحروف العربية ليجد البحث الكلمة بأي كتابة (أ/ا، ة/ه، ى/ي) */
function norm(s: string): string {
  return s
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}

export function SearchPage() {
  const state = useData();
  const [q, setQ] = useState('');
  const n = norm(q);
  const teams = n ? state.teams.filter((t) => norm(`${t.name} ${t.nickname}`).includes(n)) : [];
  const players = n ? state.players.filter((p) => norm(p.name).includes(n)).slice(0, 30) : [];

  return (
    <>
      <PageHead title="بحث" subtitle="ابحث عن كلية أو لاعب." />
      <div className="field">
        <label htmlFor="q">اسم الكلية أو اللاعب</label>
        <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>

      {n && teams.length === 0 && players.length === 0 && <EmptyState title="لا توجد نتائج" hint="جرّب كلمة أقصر أو كتابة مختلفة." />}

      {teams.length > 0 && (
        <section className="section" aria-labelledby="sr-teams">
          <div className="section-title"><h2 id="sr-teams">الكليات</h2></div>
          <div className="college-grid">
            {teams.map((t) => (
              <a key={t.id} className="college-chip" href={`#/teams/${t.id}`}>
                <TeamBadge team={t} size={34} />
                <span>{t.name}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {players.length > 0 && (
        <section className="section" aria-labelledby="sr-players">
          <div className="section-title"><h2 id="sr-players">اللاعبون</h2></div>
          <div className="college-grid">
            {players.map((p) => {
              const team = teamById(state, p.teamId);
              return (
                <a key={p.id} className="college-chip" href={`#/player/${p.id}`}>
                  <TeamBadge team={team} size={34} />
                  <span>{p.name} <small>({p.position} · {p.number})</small></span>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
