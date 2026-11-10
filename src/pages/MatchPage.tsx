import type { CSSProperties } from 'react';
import { GROUP_LABELS, MATCH_STATUS_LABELS, ROUND_LABELS } from '../data/config';
import { eventsForMatch, formatArabicDate, playerById, teamById } from '../lib/stats';
import { lineupFor } from '../lib/lineup';
import { subsForMatch } from '../lib/subs';
import { CARD_EMOJI, CARD_LABELS, cardsForMatch } from '../lib/cards';
import { LineupPitch, type PlayerMark } from '../components/LineupPitch';
import { usePhotos } from '../lib/usePhotos';
import { useData } from '../store';
import { EmptyState } from '../components/StateViews';
import { Icon } from '../components/Icon';
import { PhotoGrid } from '../components/PhotoGrid';
import { MatchMessages } from '../components/MatchMessages';
import { MatchPrediction } from '../components/MatchPrediction';
import { ShareButton } from '../components/ShareButton';
import { ShareImageButton } from '../components/ShareImageButton';
import { TeamBadge } from '../components/TeamBadge';

/** صفحة المباراة: الفريقان والنتيجة والحالة والأهداف ورجل المباراة (لا نعرض إحصاءات غير موثوقة) */
export function MatchPage({ matchId }: { matchId: string }) {
  const state = useData();
  const match = state.matches.find((m) => m.id === matchId);
  // الصور تُحمَّل عند فتح الصفحة فقط، وتُخفى القسم كلياً إن لم توجد صور أو فشل التحميل
  const { photos } = usePhotos({ matchId, limit: 12 });
  if (!match) return <EmptyState title="المباراة غير موجودة" hint="ارجع إلى جدول المباريات." />;

  const home = teamById(state, match.homeId);
  const away = teamById(state, match.awayId);
  const goals = eventsForMatch(state, match.id);
  const hasScore = match.status !== 'scheduled';
  const cards = cardsForMatch(state.cards, match.id);
  // علامات اللاعبين على الملعب: خرج 🔻، دخل 🔺، بطاقات
  const marks: Record<string, PlayerMark> = {};
  const mark = (id: string): PlayerMark => (marks[id] ??= {});
  for (const s of subsForMatch(state.subs, match.id)) { mark(s.outId).out = true; mark(s.inId).in = true; }
  for (const c of cards) { if (c.kind === 'red') mark(c.playerId).red = true; else mark(c.playerId).yellow = true; }
  // خط زمني واحد: الأهداف والبطاقات مرتبة بالدقيقة (من بلا دقيقة في الآخر)
  type Row = { key: string; minute?: number; teamId: string; kind: 'goal' | 'yellow' | 'red' | 'sub'; playerId: string; assistId?: string; inId?: string };
  const timeline: Row[] = [
    ...goals.map((e): Row => ({ key: e.id, minute: e.minute, teamId: e.teamId, kind: 'goal', playerId: e.scorerId, assistId: e.assistId })),
    ...subsForMatch(state.subs, match.id).map((s): Row => ({ key: s.id, minute: s.minute, teamId: s.teamId, kind: 'sub', playerId: s.outId, inId: s.inId })),
    ...cards.map((c): Row => ({ key: c.id, minute: c.minute, teamId: c.teamId, kind: c.kind, playerId: c.playerId })),
  ]
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.minute ?? 999) - (b.r.minute ?? 999) || a.i - b.i)
    .map((x) => x.r);
  const motm = match.motmId ? playerById(state, match.motmId) : undefined;
  const motmTeam = motm ? teamById(state, motm.teamId) : undefined;
  const shareText = hasScore
    ? `${home?.nickname} ${match.homeScore} – ${match.awayScore} ${away?.nickname} (دوري عزم)`
    : `${home?.nickname} ضد ${away?.nickname} — ${formatArabicDate(match.date)} ${match.time} (دوري عزم)`;

  return (
    <>
      <a className="back-link" href="#/fixtures"><Icon name="back" /> كل المباريات</a>

      <section className="card match-hero" style={{ '--hc': home?.color, '--ac': away?.color } as CSSProperties} aria-label={`${home?.name} ضد ${away?.name}`}>
        <div className="match">
          <div className="match-top">
            <span className="chip">{GROUP_LABELS[match.group]}</span>
            <span className="chip chip-soft">{ROUND_LABELS[match.round]}</span>
            <span className={`chip st-${match.status}`}>{MATCH_STATUS_LABELS[match.status]}</span>
          </div>
        </div>
        <div className="mh-main">
          <a className="side" href={`#/teams/${match.homeId}`}>
            <TeamBadge team={home} size={72} />
            <span className="tname">{home?.name}</span>
          </a>
          <div className="center">
            {hasScore ? (
              <div className="score" aria-label={`النتيجة ${match.homeScore} مقابل ${match.awayScore}`}>
                <span>{match.homeScore}</span>
                <span className="dash" aria-hidden="true">–</span>
                <span>{match.awayScore}</span>
              </div>
            ) : (
              <div className="kick">{match.time}</div>
            )}
          </div>
          <a className="side" href={`#/teams/${match.awayId}`}>
            <TeamBadge team={away} size={72} />
            <span className="tname">{away?.name}</span>
          </a>
        </div>
        {(timeline.length > 0 || hasScore) && (
          <div className="mh-events" role="region" aria-labelledby="goals-title">
            <h2 id="goals-title" className="mh-events-title">أحداث المباراة</h2>
          {timeline.length === 0 ? (
            <p className="mh-empty">{hasScore ? 'لم تُسجَّل تفاصيل الأحداث بعد.' : 'لم تبدأ المباراة بعد، وتظهر الأهداف والبطاقات هنا فور تسجيلها.'}</p>
          ) : (
            <ol className="goal-tl">
              {timeline.map((e) => {
                const player = playerById(state, e.playerId);
                const assister = e.assistId ? playerById(state, e.assistId) : undefined;
                const team = teamById(state, e.teamId);
                return (
                  <li key={e.key} className={e.teamId === match.homeId ? 'home' : 'away'}>
                    <span className="min" dir="ltr">{e.minute != null ? `${e.minute}'` : '—'}</span>
                    <TeamBadge team={team} size={26} />
                    <span>
                      {e.kind === 'sub' ? (
                        <>
                          <span role="img" aria-label="تبديل">🔁 </span>
                          <a href={`#/player/${e.inId}`}><strong>{playerById(state, e.inId ?? '')?.name}</strong></a>
                          <small style={{ color: 'var(--muted)' }}> بدل {player?.name}</small>
                        </>
                      ) : (
                        <>
                          {e.kind !== 'goal' && <span role="img" aria-label={CARD_LABELS[e.kind]}>{CARD_EMOJI[e.kind]} </span>}
                          <a href={`#/player/${e.playerId}`}><strong>{player?.name}</strong></a>
                        </>
                      )}
                      {assister && <small style={{ color: 'var(--muted)' }}> · صناعة: {assister.name}</small>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          </div>
        )}
        <div className="match-meta">
          <span><Icon name="calendar" /> {formatArabicDate(match.date)}</span>
          <span><Icon name="clock" /> {match.time}</span>
          <span><Icon name="pin" /> {match.venue}</span>
        </div>
      </section>

      {(() => {
        const sides = [home, away].map((t) => (t ? { team: t, lineup: lineupFor(state, match.id, t.id) } : null));
        const any = sides.some((s) => s?.lineup);
        if (!any && match.status !== 'scheduled') return null;
        return (
          <section className="section" aria-labelledby="lineups-title">
            <div className="section-title"><h2 id="lineups-title">التشكيلتان</h2></div>
            {!any ? (
              <p className="notice" role="note">لم تُعلن التشكيلتان بعد، وتظهر هنا فور تسجيلهما قبل المباراة.</p>
            ) : (
              <div className="lineups-pair">
                {sides.map((s) =>
                  s ? (
                    <div key={s.team.id}>
                      <h3 className="lineup-team">{s.team.name}</h3>
                      {s.lineup ? (
                        <LineupPitch squad={state.players.filter((p) => p.teamId === s.team.id)} lineupIds={s.lineup.playerIds} positions={s.lineup.positions} formation={s.lineup.formation} team={s.team} marks={marks} />
                      ) : (
                        <p className="notice" role="note">لم تُعلن تشكيلة {s.team.nickname} بعد.</p>
                      )}
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </section>
        );
      })()}

      {motm && (
        <section className="card section motm-card" aria-label="رجل المباراة">
          <Icon name="star" />
          <span>رجل المباراة: <a href={`#/player/${motm.id}`}><strong>{motm.name}</strong></a> <small style={{ color: 'var(--muted)' }}>({motmTeam?.nickname})</small></span>
        </section>
      )}

      {photos.length > 0 && (
        <section className="section" aria-labelledby="match-photos-title">
          <div className="section-title">
            <h2 id="match-photos-title">صور المباراة</h2>
            <a className="link-more" href="#/gallery">المعرض كاملاً</a>
          </div>
          <PhotoGrid photos={photos} />
        </section>
      )}

      {/* key: عند الانتقال لمباراة أخرى بدون إعادة تحميل يبدأ المكوّن من جديد (وإلا يظهر تصويتك السابق على المباراة الجديدة) */}
      <MatchPrediction key={match.id} match={match} home={home} away={away} />

      <MatchMessages matchId={match.id} />

      <div className="section" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <ShareImageButton match={match} />
        <ShareButton text={shareText} hash={`#/match/${match.id}`} label="مشاركة المباراة" />
      </div>
    </>
  );
}
