import { useState } from 'react';
import { TOURNAMENT } from '../data/config';

/** شعار دوري عزم: صورة الشعار الرسمي إن وُضع مساره في TOURNAMENT.logo، وإلا الدرع الافتراضي */
export function Logo({ className }: { className?: string }) {
  const [broken, setBroken] = useState(false);
  if (TOURNAMENT.logo && !broken) {
    return <img className={className} src={`${import.meta.env.BASE_URL}${TOURNAMENT.logo}`} alt="" onError={() => setBroken(true)} />;
  }
  return (
    <svg className={className} viewBox="0 0 100 116" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="azm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e4ff9a" />
          <stop offset=".5" stopColor="#b8f23a" />
          <stop offset="1" stopColor="#5f9a10" />
        </linearGradient>
      </defs>
      <path d="M50 3 94 17v49c0 26-22 42-44 48C28 108 6 92 6 66V17z" fill="url(#azm-gold)" />
      <path d="M50 11 86 23v43c0 20-17 33-36 39C31 99 14 86 14 66V23z" fill="#08141e" />
      <g fill="url(#azm-gold)">
        <polygon points="50,19 52.6,25 59,25.5 54.2,29.6 55.8,36 50,32.6 44.2,36 45.8,29.6 41,25.5 47.4,25" />
        <polygon points="32,24 33.6,27.6 37.4,27.9 34.6,30.4 35.5,34 32,32 28.5,34 29.4,30.4 26.6,27.9 30.4,27.6" />
        <polygon points="68,24 69.6,27.6 73.4,27.9 70.6,30.4 71.5,34 68,32 64.5,34 65.4,30.4 62.6,27.9 66.4,27.6" />
      </g>
      <circle cx="50" cy="66" r="24" fill="none" stroke="url(#azm-gold)" strokeWidth="3" />
      <polygon points="50,52 62,61 57.5,75 42.5,75 38,61" fill="url(#azm-gold)" />
      <path d="M50 52V42M62 61l10-4M57.5 75l7 9M42.5 75l-7 9M38 61l-10-4" stroke="url(#azm-gold)" strokeWidth="3" fill="none" />
    </svg>
  );
}
