import { useEffect, useRef, useState } from 'react';

/** مسار ملف الموسيقى داخل مجلد public. إن لم يوجد الملف يختفي الزر تلقائياً. */
const SRC = `${import.meta.env.BASE_URL}audio/anthem.mp3`;

/** زر موسيقى الدوري: لا يعمل تلقائياً أبداً، يشغّله الزائر بنفسه. الملف لا يُحمَّل حتى يُضغط الزر. */
export function MusicButton() {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const a = ref.current;
    return () => a?.pause();
  }, []);

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
      <audio ref={ref} src={SRC} loop preload="none" onError={() => setMissing(true)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <button type="button" className={`icon-btn music-btn${playing ? ' is-on' : ''}`} onClick={() => void toggle()} aria-pressed={playing} aria-label={playing ? 'إيقاف الموسيقى' : 'تشغيل موسيقى الدوري'} title={playing ? 'إيقاف الموسيقى' : 'تشغيل موسيقى الدوري'}>
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
      </button>
    </>
  );
}
