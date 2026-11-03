import { useCallback, useEffect, useState } from 'react';
import { repository } from '../services';
import { deviceId } from '../lib/device';
import { isPredictionClosed, predictionPercents, totalVotes } from '../lib/predictions';
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

/** توقع الجمهور: من سيفوز؟ صوت واحد لكل جهاز، والنسب تظهر بعد التصويت */
export function MatchPrediction({ match, home, away }: { match: Match; home?: Team; away?: Team }) {
  const [counts, setCounts] = useState<PredictionCounts | null>(null);
  const [mine, setMine] = useState<PredictionChoice | null>(() => readMine(match.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // فشل أول تحميل (غالباً لم يُشغَّل predictions.sql بعد): نخفي القسم بدل أن نُظهر ميزة معطّلة
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(() => {
    repository
      .loadPredictionCounts(match.id)
      .then((c) => {
        setCounts(c);
        setUnavailable(false);
      })
      .catch(() => setUnavailable(true));
  }, [match.id]);
  useEffect(load, [load]);

  if (repository.kind === 'local') return null;

  const closed = isPredictionClosed(match);
  const total = totalVotes(counts);
  // لا نُظهر قسماً فارغاً على مباراة انتهت بلا أي توقع، ولا قسماً معطّلاً
  if (unavailable && mine === null) return null;
  if (closed && counts && total === 0 && mine === null) return null;
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

  const showResults = mine !== null || closed;
  const pct = predictionPercents(counts);

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
                  <div className="pred-row"><span>{o.label}{mine === o.key && ' ✓'}</span><b>{pct[o.key]}%</b></div>
                  <div className="pred-track" aria-hidden="true"><span style={{ width: `${pct[o.key]}%` }} /></div>
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
