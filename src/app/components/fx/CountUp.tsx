import { useEffect, useRef, useState } from 'react';
import { useInView } from 'motion/react';

/**
 * Animated stat counter: counts from 0 to the number found in `value` when it
 * scrolls into view, preserving any prefix/suffix ("18+", "100%", "4").
 * Falls back to static text when no number is found or motion is reduced.
 */
export const CountUp = ({
  value,
  duration = 1.6,
  className = '',
}: {
  value: string;
  duration?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const match = value.match(/\d+/);
  const target = match ? parseInt(match[0], 10) : null;
  const prefix = match ? value.slice(0, match.index) : '';
  const suffix = match ? value.slice((match.index ?? 0) + match[0].length) : '';
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView || target === null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setN(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  if (target === null) return <span className={className}>{value}</span>;
  return (
    <span ref={ref} className={className}>
      {prefix}
      {n}
      {suffix}
    </span>
  );
};
