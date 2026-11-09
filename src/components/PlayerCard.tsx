import { useState, type CSSProperties } from 'react';
import type { Player, Team } from '../types';
import { TeamBadge } from './TeamBadge';
import { photoFor } from '../lib/playerPhoto';
import { AWARD_EMOJI, AWARD_LABELS, type AwardKind } from '../lib/awards';

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
  /** البطاقات الخاصة التي يحملها اللاعب الآن (هدّاف/أفضل لاعب/أفضل حارس) */
  awards?: AwardKind[];
  /** سطر إضافي تحت الاسم بدل الأهداف والصناعات (مثل: شباك نظيفة للحارس) */
  extra?: { value: number; label: string }[];
}

/** بطاقة لاعب بأسلوب بطاقات كرة القدم الأوروبية: الرقم والمركز والشارة، ثم الصورة، ثم الاسم والإحصاءات */
export function PlayerCard({ player, team, goals = 0, assists = 0, link = true, awards = [], extra }: Props) {
  const [broken, setBroken] = useState(false);
  const photo = photoFor(player);
  const showPhoto = !!photo && !broken;

  return (
    <article
      className={`pcard${player.cardStyle === 'fifa' ? ' fifa' : ''}${awards.length ? ` has-award aw-${awards[0]}` : ''}`}
      style={{ '--tc': team?.color ?? '#0e6b47' } as CSSProperties}
      aria-label={`${player.name}، ${player.position}، رقم ${player.number}${awards.length ? `، ${awards.map((a) => AWARD_LABELS[a]).join(' و')}` : ''}`}
    >
      {awards.length > 0 && (
        <div className="pc-ribbon" aria-hidden="true">
          <span>{AWARD_EMOJI[awards[0]]} {AWARD_LABELS[awards[0]]}</span>
          {awards.slice(1).map((a) => <i key={a} title={AWARD_LABELS[a]}>{AWARD_EMOJI[a]}</i>)}
        </div>
      )}
      {showPhoto ? (
        <img
          className="pimg"
          src={`${import.meta.env.BASE_URL}${photo}`}
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
          {player.cardStyle === 'fifa' && <span className="sd-flag" aria-hidden="true" />}
        </div>
        <TeamBadge team={team} size={34} />
      </div>
      <div className="pinfo">
        <div className="pname">{player.name}</div>
        <div className="pstats">
          {extra
            ? extra.map((x) => <span key={x.label}><b>{x.value}</b>{x.label}</span>)
            : <><span><b>{goals}</b>هدف</span><span><b>{assists}</b>صناعة</span></>}
        </div>
      </div>
      {link && <a className="pc-link" href={`#/player/${player.id}`} aria-label={`ملف اللاعب ${player.name}`} />}
    </article>
  );
}
