import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const SEEN_KEY = 'agroespace.intro.seen';

/**
 * Branded intro: the pivot circle draws itself while a counter runs 0→100,
 * then the curtain lifts. Shown once per browser session, skipped entirely
 * under prefers-reduced-motion. Pure overlay — the page renders beneath it,
 * so LCP/data fetching are unaffected.
 */
export const Preloader = () => {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return window.sessionStorage.getItem(SEEN_KEY) !== '1';
  });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!show) return;
    window.sessionStorage.setItem(SEEN_KEY, '1');
    document.documentElement.style.overflow = 'hidden';
    const t0 = performance.now();
    const DURATION = 1600;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION);
      setCount(Math.round((1 - Math.pow(1 - p, 2)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setShow(false), 250);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = '';
    };
  }, [show]);

  useEffect(() => {
    if (!show) document.documentElement.style.overflow = '';
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ y: '-100%' }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[300] bg-ink flex flex-col items-center justify-center"
          aria-hidden
        >
          {/* Pivot circle drawing itself */}
          <svg viewBox="0 0 120 120" className="w-28 h-28 text-lime mb-8">
            <circle
              cx="60" cy="60" r="54"
              fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeDasharray={Math.PI * 2 * 54}
              strokeDashoffset={Math.PI * 2 * 54 * (1 - count / 100)}
              transform="rotate(-90 60 60)"
            />
            <circle cx="60" cy="60" r="3" fill="currentColor" />
            <line
              x1="60" y1="60" x2="114" y2="60"
              stroke="currentColor" strokeWidth="1"
              transform={`rotate(${count * 3.6 - 90} 60 60)`}
            />
          </svg>
          <div className="font-industrial uppercase text-white text-xl tracking-[0.3em]">
            AGROESPACE
          </div>
          <div dir="ltr" className="font-mono text-lime/70 text-sm mt-3 tabular-nums">
            {String(count).padStart(3, '0')} %
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
