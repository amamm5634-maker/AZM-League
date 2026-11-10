import type { CSSProperties } from 'react';
import type { Match } from '../types';
import { GROUP_LABELS, MATCH_STATUS_LABELS, ROUND_LABELS } from '../data/config';
import { formatArabicDate, playerById, teamById } from '../lib/stats';
import { useData } from '../store';
import { Icon } from './Icon';
import { ShareButton } from './ShareButton';
import { ShareImageButton } from './ShareImageButton';
import { TeamBadge } from './TeamBadge';
import { MatchTimeline, useMatchTimeline } from './MatchTimeline';

export function MatchCard({ match, showGoals = true }: { match: Match; showGoals?: boolean }) {
  const state = useData();
  const home = teamById(state, match.homeId);
  const away = teamById(state, match.awayId);
  const timeline = useMatchTimeline(match.id);
  const hasScore = match.status !== 'scheduled';
  const motm = match.motmId ? playerById(state, match.motmId) : undefined;
  const shareText = hasScore
    ? `${home?.nickname} ${match.homeScore} – ${match.awayScore} ${away?.nickname} (دوري عزم)`
    : `${home?.nickname} ضد ${away?.nickname} — ${formatArabicDate(match.date)} ${match.time} (دوري عزم)`;

  return (
    <article
      className="card match"
      style={{ '--hc': home?.color, '--ac': away?.color } as CSSProperties}
      aria-label={`${home?.name ?? ''} ضد ${away?.name ?? ''}`}
    >
      <div className="match-top">
        <span className="chip">{GROUP_LABELS[match.group]}</span>
        <span className="chip chip-soft">{ROUND_LABELS[match.round]}</span>
        <span className={`chip st-${match.status}`}>{MATCH_STATUS_LABELS[match.status]}</span>
      </div>

      <div className="match-main">
        <a className="side" href={`#/teams/${match.homeId}`}>
          <TeamBadge team={home} size={46} />
          <span className="tname">{home?.nickname}</span>
        </a>

        <div className="center">
          {hasScore ? (
            <div className="score" aria-label={`النتيجة ${match.homeScore} مقابل ${match.awayScore}`}>
              <span>{match.homeScore}</span>
              <span className="dash" aria-hidden="true">–</span>
              <span>{match.awayScore}</span>
            </div>
          ) : (
            <div className="kick">{match.time}</div>
          )}
        </div>

        <a className="side" href={`#/teams/${match.awayId}`}>
          <TeamBadge team={away} size={46} />
          <span className="tname">{away?.nickname}</span>
        </a>
      </div>

      <div className="match-meta">
        <span><Icon name="calendar" /> {formatArabicDate(match.date)}</span>
        <span><Icon name="clock" /> {match.time}</span>
        <span><Icon name="pin" /> {match.venue}</span>
      </div>

      {motm && (
        <div className="motm"><Icon name="star" /> أفضل لاعب: <b>{motm.name}</b></div>
      )}
      <div className="match-share">
        <a className="share-btn" href={`#/match/${match.id}`}>تفاصيل المباراة</a>
        <ShareButton text={shareText} hash="#/fixtures" label="واتساب" />
        {hasScore && <ShareImageButton match={match} />}
      </div>

      {showGoals && timeline.length > 0 && (
        <details className="goals" open={match.status === 'live'}>
          <summary>أحداث المباراة ({timeline.length})</summary>
          <MatchTimeline match={match} rows={timeline} />
        </details>
      )}
    </article>
  );
}
