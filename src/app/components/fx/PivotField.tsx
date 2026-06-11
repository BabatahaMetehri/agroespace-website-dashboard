/**
 * "Precision Fields" signature mark — a central-pivot irrigation circle seen
 * from above: concentric crop rings with a slowly sweeping pivot arm.
 * Decorative only (aria-hidden). Inherits color via currentColor; rotation is
 * pure CSS (disabled under prefers-reduced-motion via tailwind.css).
 */
export const PivotField = ({
  className = '',
  arm = true,
  reverse = false,
}: {
  className?: string;
  /** Render the rotating pivot arm. */
  arm?: boolean;
  /** Spin the arm the other way (slower) for layered compositions. */
  reverse?: boolean;
}) => (
  <div aria-hidden className={`relative ${className}`}>
    {/* Static field rings */}
    <svg viewBox="0 0 400 400" fill="none" className="absolute inset-0 w-full h-full">
      <circle cx="200" cy="200" r="196" stroke="currentColor" strokeWidth="1" />
      <circle cx="200" cy="200" r="150" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 7" />
      <circle cx="200" cy="200" r="104" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="200" cy="200" r="58" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 6" />
      <circle cx="200" cy="200" r="3" fill="currentColor" />
      {/* Survey crosshair ticks */}
      <path d="M200 0v14M200 386v14M0 200h14M386 200h14" stroke="currentColor" strokeWidth="1" />
    </svg>
    {/* Rotating pivot arm — rotated as a div so transform-origin is reliable */}
    {arm && (
      <div className={`absolute inset-0 ${reverse ? 'animate-pivot-spin-rev' : 'animate-pivot-spin'}`}>
        <svg viewBox="0 0 400 400" fill="none" className="w-full h-full">
          <line x1="200" y1="200" x2="396" y2="200" stroke="currentColor" strokeWidth="1.5" />
          {/* Sprinkler drops along the arm */}
          <circle cx="258" cy="200" r="2.5" fill="currentColor" />
          <circle cx="304" cy="200" r="2.5" fill="currentColor" />
          <circle cx="350" cy="200" r="2.5" fill="currentColor" />
          <circle cx="396" cy="200" r="4" fill="currentColor" />
        </svg>
      </div>
    )}
  </div>
);
