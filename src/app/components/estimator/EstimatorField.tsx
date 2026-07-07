import { useMemo, useRef } from "react";
import { motion } from "motion/react";
import { diameterM, expandPicks, type EstimateResult } from "../../lib/pivotEstimator";
import { OBSTACLE_SPECS, type Obstacle, type Placement } from "../../lib/pivotPlacement";

/**
 * Top-down plan of the farmer's plot, drawn in metre coordinates.
 * Two modes:
 *  · exact — `placements` from the geometric engine are drawn at their true
 *    positions together with the user's obstacles;
 *  · fallback — no placements: the recommended mix is shelf-packed for a
 *    quick illustrative layout.
 * When `editable`, clicking the plan places the selected obstacle (via
 * `onPlace`) and clicking an obstacle removes it (via `onRemove`).
 */
export const EstimatorField = ({
  result,
  obstacles = [],
  placements,
  editable,
  onPlace,
  onRemove,
}: {
  result: EstimateResult;
  obstacles?: Obstacle[];
  placements?: Placement[];
  editable?: boolean;
  onPlace?: (x: number, y: number) => void;
  onRemove?: (id: string) => void;
}) => {
  const wM = result.widthM || 1;
  const hM = result.heightM || 1;
  const pad = Math.max(wM, hM) * 0.02;
  const stroke = Math.max(wM, hM) * 0.004;
  const svgRef = useRef<SVGSVGElement>(null);

  // Fallback layout when the geometric engine didn't run.
  const shelf = useMemo(() => {
    const dias = expandPicks(result.picks).map((size) => ({ size, d: diameterM(size) }));
    const out: Placement[] = [];
    let x = 0;
    let y = 0;
    let rowH = 0;
    for (const { size, d } of dias) {
      if (x + d > wM + 1e-6) {
        x = 0;
        y += rowH;
        rowH = 0;
      }
      if (y + d > hM + 1e-6) break;
      out.push({ x: x + d / 2, y: y + d / 2, r: d / 2, size });
      x += d;
      rowH = Math.max(rowH, d);
    }
    return out;
  }, [result.picks, wM, hM]);

  const circles = placements ?? shelf;

  /** Convert a mouse event to field metres (accounts for meet letterboxing). */
  const toMeters = (e: React.MouseEvent): [number, number] | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const vw = wM + 2 * pad;
    const vh = hM + 2 * pad;
    const scale = Math.min(rect.width / vw, rect.height / vh);
    const ox = (rect.width - vw * scale) / 2;
    const oy = (rect.height - vh * scale) / 2;
    const x = (e.clientX - rect.left - ox) / scale - pad;
    const y = (e.clientY - rect.top - oy) / scale - pad;
    if (x < 0 || y < 0 || x > wM || y > hM) return null;
    return [x, y];
  };

  const mark = Math.max(6, Math.max(wM, hM) * 0.012);

  return (
    <svg
      ref={svgRef}
      viewBox={`${-pad} ${-pad} ${wM + 2 * pad} ${hM + 2 * pad}`}
      className={`w-full h-full ${editable ? "cursor-crosshair" : ""}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Aperçu du champ et des pivots"
      onClick={(e) => {
        if (!editable || !onPlace) return;
        const m = toMeters(e);
        if (m) onPlace(m[0], m[1]);
      }}
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

      {/* Irrigated pivot circles */}
      {circles.map((p, i) => (
        <g key={`${p.x}-${p.y}-${i}`} pointerEvents="none">
          <motion.circle
            cx={p.x}
            cy={p.y}
            initial={{ r: 0, opacity: 0 }}
            animate={{ r: p.r, opacity: 1 }}
            transition={{ delay: i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            fill="url(#disc)"
            stroke="#87a922"
            strokeOpacity={0.7}
            strokeWidth={stroke}
          />
          <circle cx={p.x} cy={p.y} r={Math.max(wM, hM) * 0.006} fill="#eaf6c6" />
          <text
            x={p.x}
            y={p.y + p.r * 0.32}
            textAnchor="middle"
            fontSize={p.r * 0.32}
            fontWeight={800}
            fill="#eaf6c6"
            opacity={0.9}
          >
            {p.size}
          </text>
        </g>
      ))}

      {/* Obstacles (click to remove when editing) */}
      {obstacles.map((o) => {
        const common = {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            if (editable) onRemove?.(o.id);
          },
          className: editable ? "cursor-pointer" : undefined,
        };
        if (o.type === "road") {
          const w = OBSTACLE_SPECS.road.r * 2;
          return o.orient === "h" ? (
            <rect key={o.id} x={0} y={o.y - w / 2} width={wM} height={w} fill="#8a8f98" opacity={0.75} {...common} />
          ) : (
            <rect key={o.id} x={o.x - w / 2} y={0} width={w} height={hM} fill="#8a8f98" opacity={0.75} {...common} />
          );
        }
        if (o.type === "building")
          return (
            <rect
              key={o.id}
              x={o.x - 15}
              y={o.y - 15}
              width={30}
              height={30}
              fill="#b0855b"
              stroke="#e0b287"
              strokeWidth={stroke}
              {...common}
            />
          );
        if (o.type === "trees")
          return (
            <circle key={o.id} cx={o.x} cy={o.y} r={12} fill="#2f6b33" stroke="#4c9552" strokeWidth={stroke} {...common} />
          );
        // pole
        return (
          <rect
            key={o.id}
            x={o.x - mark / 2}
            y={o.y - mark / 2}
            width={mark}
            height={mark}
            fill="#e3a008"
            transform={`rotate(45 ${o.x} ${o.y})`}
            {...common}
          />
        );
      })}
    </svg>
  );
};
