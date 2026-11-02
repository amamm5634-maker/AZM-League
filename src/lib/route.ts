import { useEffect, useState } from 'react';

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function parse(): string[] {
  const h = window.location.hash.replace(/^#\/?/, '');
  return h.split('/').filter(Boolean).map(safeDecode);
}

/** مسار بسيط يعتمد على الـ hash (مناسب للاستضافة الثابتة بلا إعدادات خاصة) */
export function useRoute(): string[] {
  const [segments, setSegments] = useState<string[]>(parse);
  useEffect(() => {
    const onChange = () => {
      setSegments(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return segments;
}
