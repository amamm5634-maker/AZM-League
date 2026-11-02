import { useEffect, useState } from 'react';

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** عداد تنازلي حتى بداية يوم التاريخ المعطى (YYYY-MM-DD) بتوقيت جهاز المستخدم */
export function Countdown({ target, label }: { target: string; label: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = new Date(`${target}T00:00:00`).getTime() - now;
  if (diff <= 0) return null;
  const p = parts(diff);
  const boxes: [number, string][] = [
    [p.days, 'يوم'],
    [p.hours, 'ساعة'],
    [p.minutes, 'دقيقة'],
    [p.seconds, 'ثانية'],
  ];

  return (
    <div className="countdown" role="timer" aria-label={`${label} ${p.days} يوماً و${p.hours} ساعة`}>
      <span className="cd-label">{label}</span>
      {boxes.map(([value, unit]) => (
        <div key={unit} className="cd-box">
          <b dir="ltr">{String(value).padStart(2, '0')}</b>
          <span>{unit}</span>
        </div>
      ))}
    </div>
  );
}
