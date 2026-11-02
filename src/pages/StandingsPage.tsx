import { GROUP_IDS, TOURNAMENT } from '../data/config';
import { formatArabicDate, isDrawn } from '../lib/stats';
import { useData } from '../store';
import { EmptyState, PageHead } from '../components/StateViews';
import { StandingsTable } from '../components/StandingsTable';
import { LastUpdate } from '../components/LastUpdate';
import { ShareButton } from '../components/ShareButton';

export function StandingsPage() {
  const state = useData();
  const drawn = isDrawn(state);

  return (
    <>
      <PageHead
        title="الترتيب"
        subtitle="تُحسب الجداول تلقائياً من نتائج المباريات المنتهية: الفوز 3 نقاط، التعادل نقطة."
      />
      {drawn ? (
        <>
          <div className="page-tools">
            <LastUpdate />
            <ShareButton text="جدول ترتيب دوري عزم" hash="#/standings" label="مشاركة الترتيب" />
          </div>
          <div className="standings-grid">
            {GROUP_IDS.map((g) => <StandingsTable key={g} group={g} />)}
          </div>
          <p className="legend"><i aria-hidden="true" /> صاحبا المركزين الأول والثاني يتأهلان إلى الدور المقبل</p>
        </>
      ) : (
        <EmptyState
          title="تظهر جداول الترتيب بعد القرعة"
          hint={`تُقام القرعة يوم ${formatArabicDate(TOURNAMENT.drawDate)}.`}
        />
      )}
    </>
  );
}
