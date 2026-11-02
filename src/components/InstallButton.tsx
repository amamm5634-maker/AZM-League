import { useEffect, useState } from 'react';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** زر "ثبّت التطبيق": يظهر في الأندرويد/الكمبيوتر عند توفر التثبيت، وفي الآيفون يعرض الخطوات */
export function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (installed || standalone) return null;
  if (!evt && !isIos) return null;

  return (
    <div className="card install-card">
      <div>
        <b>ثبّت تطبيق دوري عزم</b>
        <p className="field-hint">يفتح من شاشة الهاتف مباشرة، ويعرض آخر النتائج حتى بدون إنترنت.</p>
      </div>
      {evt ? (
        <button type="button" className="btn btn-primary" onClick={() => { void evt.prompt(); setEvt(null); }}>تثبيت</button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => setShowHelp((v) => !v)}>كيف؟</button>
      )}
      {showHelp && <p className="field-hint" style={{ gridColumn: '1 / -1' }}>في Safari: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».</p>}
    </div>
  );
}
