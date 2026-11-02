import { useMemo, useState } from 'react';
import type { GroupId, Match, MatchStatus } from '../types';
import { GROUP_IDS, GROUP_LABELS, MATCH_STATUS_LABELS, ROUND_LABELS, TOURNAMENT } from '../data/config';
import { formatArabicDate, sortMatches } from '../lib/stats';
import { useData } from '../store';
import { MatchCard } from '../components/MatchCard';
import { LastUpdate } from '../components/LastUpdate';
import { EmptyState, PageHead } from '../components/StateViews';

export function FixturesPage() {
  const state = useData();
  const [group, setGroup] = useState<'all' | GroupId>('all');
  const [round, setRound] = useState<'all' | string>('all');
  const [status, setStatus] = useState<'all' | MatchStatus>('all');

  const list = useMemo(
    () =>
      sortMatches(state.matches).filter(
        (m) =>
          (group === 'all' || m.group === group) &&
          (round === 'all' || String(m.round) === round) &&
          (status === 'all' || m.status === status),
      ),
    [state.matches, group, round, status],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of list) {
      const arr = map.get(m.date);
      if (arr) arr.push(m);
      else map.set(m.date, [m]);
    }
    return [...map.entries()];
  }, [list]);

  const filtered = group !== 'all' || round !== 'all' || status !== 'all';
  const reset = () => {
    setGroup('all');
    setRound('all');
    setStatus('all');
  };

  if (state.matches.length === 0) {
    return (
      <>
        <PageHead title="المباريات والنتائج" subtitle="تابع المباريات القادمة والنتائج النهائية مع تفاصيل الأهداف." />
      <LastUpdate />
        <EmptyState
          title="يُعلن جدول المباريات بعد القرعة"
          hint={`تُقام القرعة يوم ${formatArabicDate(TOURNAMENT.drawDate)}، وتنطلق المباريات يوم ${formatArabicDate(TOURNAMENT.startDate)}.`}
        />
      </>
    );
  }

  return (
    <>
      <PageHead title="المباريات والنتائج" subtitle="تابع المباريات القادمة والنتائج النهائية مع تفاصيل الأهداف." />

      <form className="card filters" onSubmit={(e) => e.preventDefault()} aria-label="تصفية المباريات">
        <div className="field">
          <label htmlFor="f-group">المجموعة</label>
          <select id="f-group" value={group} onChange={(e) => setGroup(e.target.value as 'all' | GroupId)}>
            <option value="all">كل المجموعات</option>
            {GROUP_IDS.map((g) => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-round">الجولة</label>
          <select id="f-round" value={round} onChange={(e) => setRound(e.target.value)}>
            <option value="all">كل الجولات</option>
            {[1, 2, 3].map((r) => <option key={r} value={String(r)}>{ROUND_LABELS[r]}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-status">الحالة</label>
          <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as 'all' | MatchStatus)}>
            <option value="all">كل الحالات</option>
            {(Object.keys(MATCH_STATUS_LABELS) as MatchStatus[]).map((s) => (
              <option key={s} value={s}>{MATCH_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        {filtered && (
          <button type="button" className="btn" onClick={reset}>إزالة الفلاتر</button>
        )}
      </form>

      <p className="result-count" aria-live="polite">{list.length} مباراة</p>

      {byDate.length === 0 ? (
        <EmptyState title="لا توجد مباريات مطابقة" hint="جرّب تغيير الفلاتر أو إزالتها." />
      ) : (
        byDate.map(([date, matches]) => (
          <section key={date} aria-label={formatArabicDate(date)}>
            <h2 className="date-head">{formatArabicDate(date)}</h2>
            <div className="match-list">
              {matches.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        ))
      )}
    </>
  );
}
