import { useMemo } from "react";
import { motion } from "motion/react";
import {
  diameterM,
  expandPicks,
  type EstimateResult,
  type ObstacleLevel,
} from "../../lib/pivotEstimator";

/**
 * Illustrative top-down view of the farmer's plot: the parcel rectangle (dry
 * land) with the recommended pivots drawn as irrigated circles, shelf-packed at
 * true scale. The sand showing between the circles IS the corner waste — the
 * whole point of the estimate, made visible. Drawn in metre coordinates (the
 * exact plot dimensions the estimate derived) so the SVG viewBox handles scaling.
 */
export const EstimatorField = ({
  result,
  obstacles,
}: {
  result: EstimateResult;
  obstacles: ObstacleLevel;
}) => {
  const wM = result.widthM || 1;
  const hM = result.heightM || 1;

  const placed = useMemo(() => {
    const dias = expandPicks(result.picks).map((size) => ({
      size,
      d: diameterM(size),
    }));
    const out: { cx: number; cy: number; d: number; size: number }[] = [];
    let x = 0;
    let y = 0;
    let rowH = 0;
    for (const { size, d } of dias) {
      if (x + d > wM + 1e-6) {
        x = 0;
        y += rowH;
        rowH = 0;
      }
      if (y + d > hM + 1e-6) break; // ran out of vertical room
      out.push({ cx: x + d / 2, cy: y + d / 2, d, size });
      x += d;
      rowH = Math.max(rowH, d);
    }
    return out;
  }, [result.picks, wM, hM]);

  const stroke = Math.max(wM, hM) * 0.004;
  const pad = Math.max(wM, hM) * 0.02;

  // A few obstacle markers, purely decorative, scaled by severity.
  const obstacleMarks = useMemo(() => {
    const n = { none: 0, light: 3, moderate: 5, heavy: 7 }[obstacles];
    const marks: { x: number; y: number }[] = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < n; i++)
      marks.push({ x: pad + rnd() * (wM - 2 * pad), y: pad + rnd() * (hM - 2 * pad) });
    return marks;
  }, [obstacles, wM, hM, pad]);

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${wM + 2 * pad} ${hM + 2 * pad}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Aperçu du champ et des pivots"
    >
      <defs>
        <radialGradient id="disc" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#87a922" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#87a922" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#6c871b" stopOpacity="0.18" />
        </radialGradient>
      </defs>

      {/* Parcel (dry land) */}
      <rect
        x={0}
        y={0}
        width={wM}
        height={hM}
        rx={Math.min(wM, hM) * 0.015}
        fill="#1c2a17"
        stroke="#87a922"
        strokeOpacity={0.35}
        strokeWidth={stroke}
        strokeDasharray={`${stroke * 4} ${stroke * 3}`}
      />

      {/* Obstacles */}
      {obstacleMarks.map((m, i) => (
        <rect
          key={i}
          x={m.x}
          y={m.y}
          width={Math.max(wM, hM) * 0.018}
          height={Math.max(wM, hM) * 0.018}
          fill="#e3a008"
          opacity={0.8}
          transform={`rotate(45 ${m.x} ${m.y})`}
        />
      ))}

      {/* Irrigated pivot circles */}
      {placed.map((p, i) => (
        <g key={i}>
          <motion.circle
            cx={p.cx}
            cy={p.cy}
            initial={{ r: 0, opacity: 0 }}
            whileInView={{ r: p.d / 2, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            fill="url(#disc)"
            stroke="#87a922"
            strokeOpacity={0.7}
            strokeWidth={stroke}
          />
          {/* pivot point */}
          <circle cx={p.cx} cy={p.cy} r={Math.max(wM, hM) * 0.006} fill="#eaf6c6" />
          <text
            x={p.cx}
            y={p.cy + p.d * 0.16}
            textAnchor="middle"
            fontSize={p.d * 0.16}
            fontWeight={800}
            fill="#eaf6c6"
            opacity={0.9}
          >
            {p.size}
          </text>
        </g>
      ))}
    </svg>
  );
};
