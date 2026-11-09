import { useEffect, useRef, useState } from 'react';

/** ملفات الموسيقى داخل مجلد public/audio. إن لم يوجد الملف يختفي الزر تلقائياً. */
const TRACKS = {
  anthem: `${import.meta.env.BASE_URL}audio/anthem.mp3`,
  teams: `${import.meta.env.BASE_URL}audio/teams.mp3`,
} as const;
export type Track = keyof typeof TRACKS;

/** زر موسيقى الدوري: لا يعمل تلقائياً أبداً، يشغّله الزائر بنفسه. الملف لا يُحمَّل حتى يُضغط الزر. */
/** `track`: أغنية الدوري في كل الصفحات، وأغنية الفرق عند فتح قسم الفرق. التبديل يتم فقط لو كانت الموسيقى شغّالة. */
export function MusicButton({ track = 'anthem' }: { track?: Track }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const a = ref.current;
    return () => a?.pause();
  }, []);

  // عند تغيّر القسم: نبدّل الملف، ونواصل التشغيل فقط لو كان الزائر مشغّلها
  const prev = useRef<Track>(track);
  useEffect(() => {
    if (prev.current === track) return;
    prev.current = track;
    const a = ref.current;
    if (!a) return;
    const was = !a.paused;
    a.src = TRACKS[track];
    a.load();
    setMissing(false);
    if (was) a.play().catch(() => setPlaying(false));
  }, [track]);

  if (missing) return null;

  const toggle = async () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <audio ref={ref} src={TRACKS[track]} loop preload="none" onError={() => setMissing(true)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <button type="button" className={`music-btn${playing ? ' is-on' : ''}`} onClick={() => void toggle()} aria-pressed={playing} aria-label={playing ? 'إيقاف أغنية الدوري' : 'تشغيل أغنية الدوري'}>
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5z" />
          {playing ? (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </>
          ) : (
            <path d="m16 9 5 6m0-6-5 6" />
          )}
        </svg>
        <span className="music-label">{playing ? 'إيقاف الأغنية' : 'أغنية الدوري'}</span>
      </button>
    </>
  );
}
