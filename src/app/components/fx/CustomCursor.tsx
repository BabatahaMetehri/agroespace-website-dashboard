import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

/**
 * Premium custom cursor: a lime dot with a lagging ring that grows over
 * interactive elements. Desktop-only (pointer: fine), automatically disabled
 * on touch devices and under prefers-reduced-motion. The native cursor is
 * hidden via the `custom-cursor-active` class on <body>.
 */
export const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // Dot tracks tightly; ring lags behind for the trailing feel.
  const ringX = useSpring(x, { stiffness: 400, damping: 35 });
  const ringY = useSpring(y, { stiffness: 400, damping: 35 });

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    setEnabled(true);
    document.body.classList.add('custom-cursor-active');

    const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, summary';
    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setHovering(!!(e.target as Element)?.closest?.(INTERACTIVE));
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => {
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* Core dot */}
      <motion.div
        aria-hidden
        style={{ x, y }}
        className="fixed top-0 left-0 z-[200] pointer-events-none mix-blend-difference"
      >
        <div
          className={`rounded-full bg-white -translate-x-1/2 -translate-y-1/2 transition-[width,height] duration-200 ${
            hovering ? 'w-2 h-2' : 'w-1.5 h-1.5'
          }`}
        />
      </motion.div>
      {/* Trailing ring */}
      <motion.div
        aria-hidden
        style={{ x: ringX, y: ringY }}
        className="fixed top-0 left-0 z-[200] pointer-events-none mix-blend-difference"
      >
        <div
          className={`rounded-full border border-white -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
            pressed ? 'w-6 h-6 opacity-100' : hovering ? 'w-12 h-12 opacity-100' : 'w-8 h-8 opacity-60'
          }`}
        />
      </motion.div>
    </>
  );
};
