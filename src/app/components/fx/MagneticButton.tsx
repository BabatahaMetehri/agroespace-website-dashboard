import { ReactNode, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

/**
 * Magnetic wrapper: the child is gently pulled toward the cursor while
 * hovered, springing back on leave. Wrap any link/button. Inert on touch
 * devices (no mousemove) so it costs nothing on mobile.
 */
export const MagneticButton = ({
  children,
  className = '',
  strength = 0.35,
}: {
  children: ReactNode;
  className?: string;
  /** 0..1 — how far the element follows the cursor. */
  strength?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 16 });
  const sy = useSpring(y, { stiffness: 200, damping: 16 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
};
