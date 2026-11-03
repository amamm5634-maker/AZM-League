import { useCallback, useEffect, useState } from 'react';
import { repository } from '../services';
import { deviceId } from '../lib/device';
import type { Match, PredictionChoice, PredictionCounts, Team } from '../types';

const KEY = (matchId: string) => `azm-pred:${matchId}`;

function readMine(matchId: string): PredictionChoice | null {
  try {
    const v = window.localStorage.getItem(KEY(matchId));
    return v === 'home' || v === 'draw' || v === 'away' ? v : null;
  } catch {
    return null;
  }
}

/** التوقع يُغلق عند بدء المباراة (الحالة أو الموعد) */
function isClosed(match: Match): boolean {
  if (match.status !== 'scheduled') return true;
  const at = new Date(`${match.date}T${match.time || '00:00'}:00`).getTime();
  return Number.isFinite(at) && Date.now() >= at;
}

/** توقع الجمهور: من سيفوز؟ صوت واحد لكل جهاز، والنسب تظهر بعد التصويت */
export function MatchPrediction({ match, home, away }: { match: Match; home?: Team; away?: Team }) {
  const [counts, setCounts] = useState<PredictionCounts | null>(null);
  const [mine, setMine] = useState<PredictionChoice | null>(() => readMine(match.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    repository.loadPredictionCounts(match.id).then(setCounts).catch(() => undefined);
  }, [match.id]);
  useEffect(load, [load]);

  if (repository.kind === 'local') return null;

  const closed = isClosed(match);
  const options: { key: PredictionChoice; label: string }[] = [
    { key: 'home', label: home?.nickname ?? 'الأول' },
    { key: 'draw', label: 'تعادل' },
    { key: 'away', label: away?.nickname ?? 'الثاني' },
  ];

  const vote = async (choice: PredictionChoice) => {
    setBusy(true);
    setError(null);
    const res = await repository.submitPrediction(match.id, choice, deviceId());
    setBusy(false);
    if (res.ok) {
      try {
        window.localStorage.setItem(KEY(match.id), choice);
      } catch {
        /* لا شيء */
      }
      setMine(choice);
      load();
    } else {
      setError(res.error);
    }
  };

  const total = counts ? counts.home + counts.draw + counts.away : 0;
  const showResults = mine !== null || closed;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <section className="section prediction" aria-labelledby="pred-title">
      <div className="section-title"><h2 id="pred-title">من سيفوز برأيك؟</h2></div>
      <div className="card prediction-card">
        {!showResults ? (
          <>
            <div className="pred-buttons" role="group" aria-label="اختر توقعك">
              {options.map((o) => (
                <button key={o.key} type="button" className="btn btn-dark" onClick={() => void vote(o.key)} disabled={busy}>{o.label}</button>
              ))}
            </div>
            <p className="field-hint">توقع واحد لكل مباراة، ويُغلق عند صافرة البداية. تظهر النسب بعد تصويتك.</p>
          </>
        ) : (
          <>
            <ul className="pred-bars">
              {options.map((o) => (
                <li key={o.key} className={mine === o.key ? 'mine' : undefined}>
                  <div className="pred-row"><span>{o.label}{mine === o.key && ' ✓'}</span><b>{pct(counts?.[o.key] ?? 0)}%</b></div>
                  <div className="pred-track" aria-hidden="true"><span style={{ width: `${pct(counts?.[o.key] ?? 0)}%` }} /></div>
                </li>
              ))}
            </ul>
            <p className="field-hint">
              {total > 0 ? `${total} ${total === 1 ? 'توقع' : 'توقعات'}` : 'لا توقعات بعد'}
              {closed && !mine && ' · أُغلق التوقع'}
            </p>
          </>
        )}
        {error && <p role="alert" className="stands-notice error">{error}</p>}
      </div>
    </section>
  );
}
