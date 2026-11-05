import type { CSSProperties, ReactNode } from 'react';

const FENCE: CSSProperties = { backgroundImage: `url(${import.meta.env.BASE_URL}images/gate-fence.jpg)` };

/** القفل: مغلق في شاشة الدخول، ويُفتح (يرتفع المقبض) عند الدخول */
function Padlock({ open = false }: { open?: boolean }) {
  return (
    <svg className={`gate-lock${open ? ' is-open' : ''}`} viewBox="0 0 64 80" width="64" height="80" aria-hidden="true" focusable="false">
      <path className="shackle" d="M18 36V24a14 14 0 0 1 28 0v12" fill="none" stroke="#d4af37" strokeWidth="7" strokeLinecap="round" />
      <rect x="8" y="34" width="48" height="38" rx="8" fill="#d4af37" />
      <rect x="8" y="34" width="48" height="38" rx="8" fill="url(#gl)" />
      <circle cx="32" cy="50" r="5" fill="#2a2108" />
      <rect x="30" y="53" width="4" height="10" rx="2" fill="#2a2108" />
      <defs>
        <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** شاشة الدخول: سياج الملعب مغلق بقفل خلف بطاقة الدخول */
export function GateScene({ children }: { children: ReactNode }) {
  return (
    <div className="gate-scene" style={FENCE}>
      <div className="gate-body">
        <Padlock />
        {children}
      </div>
    </div>
  );
}

/** حركة الانفتاح بعد الدخول: يرتفع مقبض القفل ثم يتباعد نصفا البوابة */
export function GateOpening() {
  return (
    <div className="gate-opening" aria-hidden="true">
      <div className="gate-door l"><div style={FENCE} /></div>
      <div className="gate-door r"><div style={FENCE} /></div>
      <Padlock open />
    </div>
  );
}
