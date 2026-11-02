import { useState, type CSSProperties } from 'react';
import type { Player, Team } from '../types';
import { TeamBadge } from './TeamBadge';

function Silhouette() {
  return (
    <svg className="sil" viewBox="0 0 100 110" aria-hidden="true" focusable="false">
      <circle cx="50" cy="34" r="20" fill="currentColor" />
      <path d="M8 110c0-26 18-44 42-44s42 18 42 44z" fill="currentColor" />
    </svg>
  );
}

interface Props {
  player: Player;
  team?: Team;
  goals?: number;
  assists?: number;
  link?: boolean;
}

/** بطاقة لاعب بأسلوب بطاقات كرة القدم الأوروبية: الرقم والمركز والشارة، ثم الصورة، ثم الاسم والإحصاءات */
export function PlayerCard({ player, team, goals = 0, assists = 0, link = true }: Props) {
  const [broken, setBroken] = useState(false);
  const showPhoto = !!player.photo && !broken;

  return (
    <article
      className="pcard"
      style={{ '--tc': team?.color ?? '#0e6b47' } as CSSProperties}
      aria-label={`${player.name}، ${player.position}، رقم ${player.number}`}
    >
      {showPhoto ? (
        <img
          className="pimg"
          src={`${import.meta.env.BASE_URL}${player.photo}`}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <Silhouette />
      )}
      <span className="pwm" aria-hidden="true">{player.number}</span>
      <div className="pc-top" aria-hidden="true">
        <div className="pc-id">
          <span className="pnum">{player.number}</span>
          <span className="ppos">{player.position}</span>
        </div>
        <TeamBadge team={team} size={34} />
      </div>
      <div className="pinfo">
        <div className="pname">{player.name}</div>
        <div className="pstats">
          <span><b>{goals}</b>هدف</span>
          <span><b>{assists}</b>صناعة</span>
        </div>
      </div>
      {link && <a className="pc-link" href={`#/player/${player.id}`} aria-label={`ملف اللاعب ${player.name}`} />}
    </article>
  );
}
