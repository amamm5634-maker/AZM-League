import { useState } from 'react';
import type { Team } from '../types';
import { TEAM_EMOJI } from '../data/teamEmoji';


/** شارة الفريق: شعار الكلية إن وُجد (team.logo)، وإلا رمزها بلون الكلية */
export function TeamBadge({ team, size = 40 }: { team?: Team; size?: number }) {
  const [broken, setBroken] = useState(false);
  const showLogo = !!team?.logo && !broken;
  const emoji = team ? TEAM_EMOJI[team.nickname] : undefined;
  const long = (team?.short.length ?? 1) > 2;
  return (
    <span
      className={`badge${showLogo ? ' has-logo' : ''}`}
      style={{
        backgroundColor: showLogo ? undefined : team?.color ?? '#475569',
        width: size,
        height: size,
        fontSize: emoji ? Math.round(size * 0.5) : Math.round(size * (long ? 0.29 : 0.36)),
      }}
      aria-hidden="true"
    >
      {showLogo ? (
        <img src={`${import.meta.env.BASE_URL}${team!.logo}`} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        emoji ?? team?.short ?? '؟'
      )}
    </span>
  );
}
