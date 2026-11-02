import { useState } from 'react';
import { SPONSORS, type Sponsor } from '../data/sponsors';

function SponsorItem({ s, size }: { s: Sponsor; size: 'lg' | 'sm' }) {
  const [broken, setBroken] = useState(false);
  const inner =
    s.logo && !broken ? (
      <img src={`${import.meta.env.BASE_URL}${s.logo}`} alt={s.name} loading="lazy" onError={() => setBroken(true)} />
    ) : (
      <span className="sp-name">{s.name}</span>
    );
  const cls = `sponsor sp-${size}`;
  return s.url ? (
    <a className={cls} href={s.url} target="_blank" rel="noopener noreferrer sponsored" aria-label={`الراعي: ${s.name}`}>{inner}</a>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

/** قسم "رعاة الدوري" في الصفحة الرئيسية. لا يظهر شيئاً إن لم يوجد رعاة */
export function SponsorsSection() {
  if (SPONSORS.length === 0) return null;
  const main = SPONSORS.filter((s) => s.tier === 'main');
  const partners = SPONSORS.filter((s) => s.tier === 'partner');
  return (
    <section className="section" aria-labelledby="sponsors-title">
      <div className="section-title"><h2 id="sponsors-title">رعاة الدوري</h2></div>
      {main.length > 0 && (
        <div className="sponsors main">
          <span className="sp-kicker">برعاية</span>
          {main.map((s) => <SponsorItem key={s.name} s={s} size="lg" />)}
        </div>
      )}
      {partners.length > 0 && (
        <div className="sponsors">
          {partners.map((s) => <SponsorItem key={s.name} s={s} size="sm" />)}
        </div>
      )}
    </section>
  );
}

/** شريط صغير في تذييل كل الصفحات للراعي الرئيسي */
export function SponsorsFooter() {
  const main = SPONSORS.filter((s) => s.tier === 'main');
  if (main.length === 0) return null;
  return (
    <div className="sponsors footer">
      <span className="sp-kicker">برعاية</span>
      {main.map((s) => <SponsorItem key={s.name} s={s} size="sm" />)}
    </div>
  );
}
