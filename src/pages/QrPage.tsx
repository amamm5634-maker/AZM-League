import { useState } from 'react';
import { PageHead } from '../components/StateViews';
import { siteUrl } from '../components/ShareButton';

/** رمز QR للطباعة على الملصقات. يُولَّد عبر خدمة api.qrserver.com، لذلك يحتاج اتصالاً بالإنترنت */
export function QrPage() {
  const [url, setUrl] = useState(() => siteUrl('#/'));
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=${encodeURIComponent(url)}`;

  return (
    <>
      <PageHead title="رمز QR للموقع" subtitle="اطبعه على الملصقات ليصل الناس مباشرة إلى الموقع." />
      <div className="card qr-card">
        <div className="field no-print">
          <label htmlFor="qr-url">رابط الموقع</label>
          <input id="qr-url" type="text" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <img className="qr-img" src={src} alt={`رمز QR يفتح ${url}`} width={300} height={300} />
        <div className="no-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>طباعة</button>
          <a className="btn btn-ghost" href={src} target="_blank" rel="noopener noreferrer" download="azm-league-qr.png">فتح الصورة</a>
        </div>
      </div>
    </>
  );
}
