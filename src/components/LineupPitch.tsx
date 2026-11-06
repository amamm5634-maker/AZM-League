import type { CSSProperties } from 'react';
import type { Player, Team } from '../types';
import { buildFormation } from '../lib/lineup';
import { assetUrl } from '../lib/asset';

/** يعرض التشكيلة الأساسية التي سجّلها المسؤول على الملعب، والباقون من قائمة الفريق بدلاء */
export interface PlayerMark { out?: boolean; in?: boolean; yellow?: boolean; red?: boolean }

export function LineupPitch({ squad, lineupIds, team, marks }: { squad: Player[]; lineupIds: string[]; team: Team; marks?: Record<string, PlayerMark> }) {
  const badge = (id: string) => {
    const m = marks?.[id];
    if (!m) return '';
    return `${m.red ? ' 🟥' : m.yellow ? ' 🟨' : ''}${m.out ? ' 🔻' : ''}${m.in ? ' 🔺' : ''}`;
  };
  const { rows, label, subs } = buildFormation(squad, lineupIds);
  const pitchStyle = {
    '--tc': team.color,
    '--pitch-photo': `url("${assetUrl('images/field-lineup.jpg')}")`,
  } as CSSProperties;

  return (
    <div>
      <div className="pitch" style={pitchStyle} role="img" aria-label={`تشكيلة ${team.name} ${label}`}>
        <i className="pbox top" aria-hidden="true" />
        <i className="pbox bot" aria-hidden="true" />
        {rows.map((row, ri) => (
          <div key={ri} className="pitch-row">
            {row.map((p) => (
              <a key={p.id} className={`pl${marks?.[p.id]?.out || marks?.[p.id]?.red ? ' gone' : ''}`} href={`#/player/${p.id}`}>
                <span className="dot">{p.number}</span>
                <span className="nm">{p.name}{badge(p.id)}</span>
              </a>
            ))}
          </div>
        ))}
      </div>
      <p className="field-hint" style={{ textAlign: 'center', marginTop: 6 }} dir="ltr">{label}</p>
      {subs.length > 0 && (
        <div className="subs">
          <h3>البدلاء</h3>
          <ul>
            {subs.map((p) => (
              <li key={p.id}><span className="num-badge">{p.number}</span> {p.name}{badge(p.id)} <small>({p.position})</small>{marks?.[p.id]?.in && <small> · دخل</small>}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
