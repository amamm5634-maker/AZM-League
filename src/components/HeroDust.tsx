import { useEffect, useRef } from 'react';

/** غبار خفيف في أضواء الكشّافات: 36 ذرة فقط، 30 إطاراً/ثانية، يتوقف خارج الشاشة وعند إخفاء التبويب */
export function HeroDust() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    const dots = Array.from({ length: 36 }, () => ({
      x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6,
      vy: 0.015 + Math.random() * 0.03, vx: (Math.random() - 0.5) * 0.01, a: 0.15 + Math.random() * 0.45,
    }));

    let visible = true;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden || t - last < 33) return;
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.y -= d.vy / 30;
        d.x += d.vx / 30;
        if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
        ctx.beginPath();
        ctx.fillStyle = `rgba(228,255,154,${d.a})`;
        ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="hero-dust" aria-hidden="true" />;
}
