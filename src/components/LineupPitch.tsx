import type { CSSProperties } from 'react';
import type { Player, Team } from '../types';
import { buildFormation } from '../lib/lineup';

/** يعرض التشكيلة الأساسية التي سجّلها المسؤول على الملعب، والباقون من قائمة الفريق بدلاء */
export function LineupPitch({ squad, lineupIds, team }: { squad: Player[]; lineupIds: string[]; team: Team }) {
  const { rows, label, subs } = buildFormation(squad, lineupIds);
  const pitchStyle = {
    '--tc': team.color,
    '--pitch-photo': `url("${import.meta.env.BASE_URL}images/field-aerial-v.jpg")`,
  } as CSSProperties;

  return (
    <div>
      <div className="pitch" style={pitchStyle} role="img" aria-label={`تشكيلة ${team.name} ${label}`}>
        <i className="pbox top" aria-hidden="true" />
        <i className="pbox bot" aria-hidden="true" />
        {rows.map((row, ri) => (
          <div key={ri} className="pitch-row">
            {row.map((p) => (
              <a key={p.id} className="pl" href={`#/player/${p.id}`}>
                <span className="dot">{p.number}</span>
                <span className="nm">{p.name}</span>
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
              <li key={p.id}><span className="num-badge">{p.number}</span> {p.name} <small>({p.position})</small></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
