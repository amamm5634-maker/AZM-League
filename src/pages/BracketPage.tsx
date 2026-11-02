import { computeBracket, type BracketMatch, type Slot } from '../lib/bracket';
import { isDrawn, teamById } from '../lib/stats';
import { useData } from '../store';
import { EmptyState, PageHead } from '../components/StateViews';
import { TeamBadge } from '../components/TeamBadge';

function SlotRow({ slot }: { slot: Slot }) {
  const state = useData();
  const team = slot.teamId ? teamById(state, slot.teamId) : undefined;
  if (!team) {
    return (
      <div className="bk-slot empty">
        <span className="bk-ph" aria-hidden="true" />
        <span>{slot.label}</span>
      </div>
    );
  }
  return (
    <a className="bk-slot" href={`#/teams/${team.id}`}>
      <TeamBadge team={team} size={30} />
      <span className="bk-name">{team.nickname}</span>
      {slot.provisional && <small className="bk-tag">مؤقت</small>}
    </a>
  );
}

function Tie({ m, title }: { m: BracketMatch; title?: string }) {
  return (
    <div className="bk-tie" role="group" aria-label={title}>
      <SlotRow slot={m.home} />
      <SlotRow slot={m.away} />
    </div>
  );
}

/** شجرة الأدوار الإقصائية: تُملأ تلقائياً من ترتيب المجموعات */
export function BracketPage() {
  const state = useData();
  if (!isDrawn(state)) {
    return (
      <>
        <PageHead title="الأدوار الإقصائية" subtitle="يتأهل صاحبا المركزين الأول والثاني من كل مجموعة." />
        <EmptyState title="تظهر الشجرة بعد القرعة" hint="تمتلئ المقاعد تلقائياً من ترتيب المجموعات." />
      </>
    );
  }
  const b = computeBracket(state);
  const doneCount = Object.values(b.groupsDone).filter(Boolean).length;

  return (
    <>
      <PageHead
        title="الأدوار الإقصائية"
        subtitle={`8 فرق تتأهل من دور المجموعات. انتهت ${doneCount} من 4 مجموعات، والمقاعد المؤقتة تتغير مع كل نتيجة.`}
      />
      <div className="bracket">
        <section aria-labelledby="bk-qf">
          <h2 id="bk-qf" className="bk-title">ربع النهائي</h2>
          {b.quarters.map((m, i) => <Tie key={m.id} m={m} title={`ربع النهائي ${i + 1}`} />)}
        </section>
        <section aria-labelledby="bk-sf">
          <h2 id="bk-sf" className="bk-title">نصف النهائي</h2>
          {b.semis.map((m, i) => <Tie key={m.id} m={m} title={`نصف النهائي ${i + 1}`} />)}
        </section>
        <section aria-labelledby="bk-f">
          <h2 id="bk-f" className="bk-title gold">النهائي</h2>
          <Tie m={b.final} title="النهائي" />
        </section>
      </div>
      <p className="field-hint" style={{ marginTop: 14 }}>
        الأزواج مقترحة (تقاطع بين المجموعات) وتُعتمد عند إعلان اللجنة. تسجيل نتائج الأدوار الإقصائية يُضاف في مرحلة لاحقة.
      </p>
    </>
  );
}
