import { TOURNAMENT, STATUS_LABELS } from '../data/config';
import { formatArabicDate } from '../lib/stats';
import { Icon } from '../components/Icon';
import { PageHead } from '../components/StateViews';

const FAQ: { q: string; a: string }[] = [
  { q: 'متى أُجريت القرعة؟', a: `أُجريت القرعة يوم ${formatArabicDate(TOURNAMENT.drawDate)} بحضور ممثلي الكليات، والمجموعات في صفحة القرعة.` },
  { q: 'أين تقام المباريات؟', a: TOURNAMENT.venue },
  { q: 'كيف أتابع النتائج؟', a: 'تُنشر النتائج والترتيب والهدافون هنا فور انتهاء كل مباراة.' },
];

export function AboutPage() {
  const { contact } = TOURNAMENT;
  return (
    <>
      <PageHead title="عن الدوري" subtitle={`${TOURNAMENT.tagline} — ${TOURNAMENT.university}`} />

      <section className="card" aria-labelledby="about-info">
        <h2 id="about-info" style={{ fontSize: '1.1rem', color: 'var(--head)', marginBottom: 10 }}>معلومات عامة</h2>
        <ul className="info-list">
          <li><Icon name="trophy" /><span><strong>الدوري:</strong> {TOURNAMENT.name} — {TOURNAMENT.university}، {TOURNAMENT.batch}</span></li>
          <li><Icon name="info" /><span><strong>الحالة:</strong> {STATUS_LABELS[TOURNAMENT.status]}</span></li>
          <li><Icon name="calendar" /><span><strong>القرعة:</strong> {formatArabicDate(TOURNAMENT.drawDate)} بحضور ممثلي الكليات</span></li>
          <li><Icon name="calendar" /><span><strong>صافرة البداية:</strong> {formatArabicDate(TOURNAMENT.startDate)}</span></li>
          <li><Icon name="pin" /><span><strong>الميدان:</strong> {TOURNAMENT.venue}</span></li>
          <li><Icon name="shield" /><span><strong>الجهة المنظمة:</strong> {TOURNAMENT.organizer}</span></li>
          <li><Icon name="info" /><span><strong>التطوير التقني:</strong> {TOURNAMENT.technicalDevelopment}</span></li>
        </ul>
      </section>

      <section className="card section" aria-labelledby="about-rules">
        <h2 id="about-rules" style={{ fontSize: '1.1rem', color: 'var(--head)', marginBottom: 10 }}>نظام الدوري</h2>
        <ol className="rules">
          {TOURNAMENT.rules.map((r) => <li key={r}>{r}</li>)}
        </ol>
      </section>

      <section className="card section" aria-labelledby="about-faq">
        <h2 id="about-faq" style={{ fontSize: '1.1rem', color: 'var(--head)', marginBottom: 10 }}>أسئلة شائعة</h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="card section" aria-labelledby="about-contact">
        <h2 id="about-contact" style={{ fontSize: '1.1rem', color: 'var(--head)', marginBottom: 10 }}>للتواصل</h2>
        <ul className="info-list">
          <li><Icon name="mail" /><span>البريد: {contact.email}</span></li>
          <li><Icon name="phone" /><span>الهاتف: <a href={`tel:${contact.phone}`} dir="ltr">{contact.phone}</a></span></li>
          <li><Icon name="pin" /><span>{contact.address}</span></li>
        </ul>
      </section>
    </>
  );
}
