import { ReactNode } from 'react';

/**
 * Infinite horizontal marquee. Content is rendered twice and shifted -50%,
 * so the loop is seamless as long as children are wider than the viewport.
 * Forced LTR internally so the translateX animation behaves identically on
 * Arabic (RTL) pages. Animation pauses under prefers-reduced-motion.
 */
export const Marquee = ({
  children,
  className = '',
  speed = 36,
}: {
  children: ReactNode;
  className?: string;
  /** Loop duration in seconds — higher is slower. */
  speed?: number;
}) => (
  <div dir="ltr" className={`overflow-hidden ${className}`}>
    <div
      className="flex w-max animate-marquee"
      style={{ animationDuration: `${speed}s` }}
    >
      <div className="flex shrink-0 items-center">{children}</div>
      <div className="flex shrink-0 items-center" aria-hidden>
        {children}
      </div>
    </div>
  </div>
);
