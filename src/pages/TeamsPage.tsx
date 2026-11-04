import { useMemo, useState, type CSSProperties } from 'react';
import type { GroupId } from '../types';
import { GROUP_IDS, GROUP_LABELS, TOURNAMENT } from '../data/config';
import { qualificationOutlook } from '../lib/scenarios';
import { computePlayerStats, computeStandings, featuredFirst, sortMatches, teamById } from '../lib/stats';
import { useData } from '../store';
import { Icon } from '../components/Icon';
import { LineupPitch } from '../components/LineupPitch';
import { MatchCard } from '../components/MatchCard';
import { PlayerCard } from '../components/PlayerCard';
import { EmptyState, PageHead } from '../components/StateViews';
import { TeamBadge } from '../components/TeamBadge';

export function TeamsPage() {
  const state = useData();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<'all' | GroupId>('all');

  const teams = useMemo(() => {
    const q = query.trim();
    const list = state.teams.filter(
      (t) => (group === 'all' || t.group === group) && (!q || t.name.includes(q) || t.nickname.includes(q)),
    );
    return featuredFirst(list);
  }, [state.teams, query, group]);

  const drawn = state.teams.every((t) => !!t.group);

  return (
    <>
      <PageHead title="الفرق واللاعبون" subtitle="اضغط على أي كلية لعرض تشكيلتها ولاعبيها ومبارياتها." />
      <form className="card filters" style={{ gridTemplateColumns: drawn ? '1fr 1fr' : '1fr' }} onSubmit={(e) => e.preventDefault()} role="search">
        <div className="field">
          <label htmlFor="t-search">بحث عن كلية</label>
          <input id="t-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="مثال: هندسة" />
        </div>
        {drawn && (
          <div className="field">
            <label htmlFor="t-group">المجموعة</label>
            <select id="t-group" value={group} onChange={(e) => setGroup(e.target.value as 'all' | GroupId)}>
              <option value="all">كل المجموعات</option>
              {GROUP_IDS.map((g) => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
            </select>
          </div>
        )}
      </form>

      {teams.length === 0 ? (
        <EmptyState title="لا توجد كليات مطابقة" hint="جرّب كلمة بحث أخرى." />
      ) : (
        <div className="teams-grid">
          {teams.map((t) => {
            const count = state.players.filter((p) => p.teamId === t.id).length;
            return (
              <a key={t.id} href={`#/teams/${t.id}`} className="card team-card" data-s={t.short} style={{ '--tc': t.color } as CSSProperties} aria-label={`فريق ${t.name}`}>
                <div className="top">
                  <TeamBadge team={t} size={52} />
                  <div>
                    <h3>{t.name}</h3>
                    <div className="nick">{t.group ? GROUP_LABELS[t.group] : 'بانتظار القرعة'}</div>
                  </div>
                </div>
                <ul>
                  <li>{count > 0 ? `${count} لاعباً مسجلاً` : 'سيتم إضافة اللاعبين قريباً'}</li>
                </ul>
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}

export function TeamDetailPage({ teamId }: { teamId: string }) {
  const state = useData();
  const team = teamById(state, teamId);

  if (!team) {
    return (
      <>
        <a className="back-link" href="#/teams"><Icon name="back" /> كل الفرق</a>
        <EmptyState title="الفريق غير موجود" hint="ربما تغيّر الرابط. ارجع لقائمة الفرق." />
      </>
    );
  }

  const table = team.group ? computeStandings(state)[team.group] : [];
  const row = table.find((r) => r.teamId === team.id);
  const outlook = qualificationOutlook(state, team.id);
  const rank = table.findIndex((r) => r.teamId === team.id) + 1;
  const stats = computePlayerStats(state);
  const squad = state.players.filter((p) => p.teamId === team.id).sort((a, b) => a.number - b.number);
  const matches = sortMatches(state.matches.filter((m) => m.homeId === team.id || m.awayId === team.id));

  return (
    <>
      <a className="back-link" href="#/teams"><Icon name="back" /> كل الفرق</a>

      <section className="card team-banner" aria-labelledby="team-title">
        <div className="team-hero">
          <TeamBadge team={team} size={76} />
          <div>
            <h1 id="team-title">{team.name}</h1>
            <p style={{ color: 'var(--muted)' }}>
              {TOURNAMENT.name} · {team.group ? GROUP_LABELS[team.group] : 'بانتظار القرعة'}
            </p>
          </div>
        </div>
        {row && row.played > 0 && (
          <div className="mini-stats" aria-label="أداء الفريق">
            <div><b>{rank}</b><span>المركز</span></div>
            <div><b>{row.pts}</b><span>نقاط</span></div>
            <div><b>{row.played}</b><span>لعب</span></div>
            <div><b dir="ltr">{row.gd > 0 ? `+${row.gd}` : row.gd}</b><span>فارق الأهداف</span></div>
          </div>
        )}
        {outlook && state.matches.length > 0 && (
          <p className={`outlook ${outlook.kind}`} role="note">
            <span className="ol-label">ماذا تحتاج؟</span> {outlook.text}
          </p>
        )}
      </section>

      <section className="section" aria-labelledby="lineup-title">
        <div className="section-title"><h2 id="lineup-title">التشكيلة</h2></div>
        {squad.length === 0 && <p className="notice" role="note" style={{ marginBottom: 12 }}>{TOURNAMENT.playersNotice}</p>}
        <LineupPitch squad={squad} team={team} />
      </section>

      {squad.length > 0 && (
        <section className="section" aria-labelledby="players-title">
          <div className="section-title"><h2 id="players-title">اللاعبون ({squad.length})</h2></div>
          <div className="players-grid">
            {squad.map((p) => {
              const s = stats.find((x) => x.playerId === p.id);
              return <PlayerCard key={p.id} player={p} team={team} goals={s?.goals ?? 0} assists={s?.assists ?? 0} />;
            })}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="tm-title">
        <div className="section-title"><h2 id="tm-title">مباريات الفريق</h2></div>
        {matches.length === 0 ? (
          <EmptyState title="تُعلن المباريات بعد القرعة" />
        ) : (
          <div className="match-list">
            {matches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </section>
    </>
  );
}
