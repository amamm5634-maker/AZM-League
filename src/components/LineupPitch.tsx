import type { CSSProperties } from 'react';
import type { Player, Team } from '../types';
import { pickLineup } from '../lib/lineup';

export function LineupPitch({ squad, team }: { squad: Player[]; team: Team }) {
  const { rows, subs } = pickLineup(squad);
  const pitchStyle = {
    '--tc': team.color,
    '--pitch-photo': `url("${import.meta.env.BASE_URL}images/field-aerial-v.jpg")`,
  } as CSSProperties;

  return (
    <div>
      <div className="pitch" style={pitchStyle} role="img" aria-label={`تشكيلة ${team.name} 4-3-3`}>
        <i className="pbox top" aria-hidden="true" />
        <i className="pbox bot" aria-hidden="true" />
        {rows.map((row, ri) => (
          <div key={ri} className="pitch-row">
            {row.map((p, ci) => (
              <div key={ci} className="pl">
                <span className={`dot${p ? '' : ' empty'}`}>{p ? p.number : '؟'}</span>
                <span className="nm">{p ? p.name : 'قريباً'}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="field-hint" style={{ textAlign: 'center', marginTop: 6 }}>التشكيلة 4-3-3 (تُحدَّث عند وصول القائمة الرسمية)</p>
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
