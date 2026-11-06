import { computePlayerStats, playerById, teamById } from '../lib/stats';
import { useData } from '../store';
import { EmptyState } from '../components/StateViews';
import { Icon } from '../components/Icon';
import { PlayerCard } from '../components/PlayerCard';
import { computeAwards } from '../lib/awards';
import { ShareButton } from '../components/ShareButton';
import { TeamBadge } from '../components/TeamBadge';

/** ملف اللاعب: البطاقة والكلية والأهداف والصناعات وجوائز رجل المباراة */
export function PlayerPage({ playerId }: { playerId: string }) {
  const state = useData();
  const player = playerById(state, playerId);
  if (!player) return <EmptyState title="اللاعب غير موجود" hint="ارجع إلى صفحة الفرق." />;

  const team = teamById(state, player.teamId);
  const stat = computePlayerStats(state).find((s) => s.playerId === player.id);
  const goals = stat?.goals ?? 0;
  const assists = stat?.assists ?? 0;
  const motm = state.matches.filter((m) => m.motmId === player.id).length;

  return (
    <>
      <a className="back-link" href={`#/teams/${player.teamId}`}><Icon name="back" /> {team?.name}</a>
      <section className="player-hero">
        <div className="ph-card">
          <PlayerCard player={player} team={team} goals={goals} assists={assists} link={false} awards={computeAwards(state)[player.id]} />
        </div>
        <div className="ph-info">
          <h1>{player.name}</h1>
          <a className="team-line" href={`#/teams/${player.teamId}`}>
            <TeamBadge team={team} size={34} />
            <strong>{team?.name}</strong>
          </a>
          <div>
            <span className="chip">{player.position}</span>
          </div>
          <div className="mini-stats" aria-label="إحصاءات اللاعب">
            <div><b>{player.number}</b><span>رقم القميص</span></div>
            <div><b>{goals}</b><span>أهداف</span></div>
            <div><b>{assists}</b><span>صناعة</span></div>
            <div><b>{motm}</b><span>رجل المباراة</span></div>
          </div>
          <div>
            <ShareButton text={`${player.name} — ${team?.nickname} (دوري عزم)`} hash={`#/player/${player.id}`} label="مشاركة اللاعب" />
          </div>
        </div>
      </section>
    </>
  );
}
