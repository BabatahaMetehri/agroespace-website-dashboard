/**
 * Geometric pivot placement — the "smart" estimator path.
 *
 * When the user places obstacles on the plan, we stop using qualitative
 * derating factors and instead pack real circles into the real rectangle:
 * each candidate pivot centre is scanned on a grid and accepted only if the
 * irrigated circle stays inside the field, keeps a clearance from every
 * obstacle (per obstacle type) and doesn't overlap an already-placed pivot.
 * Several size orderings are tried (largest-first, 30-ha-first, …) and the
 * best plan wins: maximum irrigated area, then minimum installed cost.
 *
 * Pure + deterministic → unit-tested, runs entirely in the browser.
 */

import {
  INVENTORY,
  HA_M2,
  radiusM,
  cellHa,
  pivotCost,
  ET0_PEAK_MM,
  CROP_KC,
  APP_EFFICIENCY,
  DAILY_HOURS,
  type Crop,
  type EstimateResult,
  type PivotSize,
  type Shape,
} from "./pivotEstimator";

export type ObstacleType = "pole" | "building" | "trees" | "road";

export interface Obstacle {
  id: string;
  type: ObstacleType;
  /** Centre position in metres from the field's top-left corner. */
  x: number;
  y: number;
  /** Roads only: strip orientation — "v" crosses top↕bottom, "h" left↔right. */
  orient?: "h" | "v";
}

/** Clearance (m) the irrigated circle must keep from each obstacle type.
 *  For roads this is the half-width of the strip. */
export const OBSTACLE_SPECS: Record<ObstacleType, { r: number }> = {
  pole: { r: 4 },
  building: { r: 22 },
  trees: { r: 15 },
  road: { r: 5 },
};

export interface Placement {
  x: number;
  y: number;
  r: number;
  size: PivotSize;
}

/** Minimum gap between two neighbouring pivot circles (wheel tracks). */
const MARGIN = 2;

function fits(
  x: number,
  y: number,
  r: number,
  placed: Placement[],
  obstacles: Obstacle[],
): boolean {
  for (const p of placed) {
    const need = r + p.r + MARGIN;
    if ((x - p.x) ** 2 + (y - p.y) ** 2 < need * need) return false;
  }
  for (const o of obstacles) {
    const spec = OBSTACLE_SPECS[o.type];
    if (o.type === "road") {
      if (o.orient === "h") {
        if (Math.abs(y - o.y) < r + spec.r) return false;
      } else if (Math.abs(x - o.x) < r + spec.r) return false;
    } else {
      const need = r + spec.r;
      if ((x - o.x) ** 2 + (y - o.y) ** 2 < need * need) return false;
    }
  }
  return true;
}

function findSpot(
  wM: number,
  hM: number,
  r: number,
  step: number,
  placed: Placement[],
  obstacles: Obstacle[],
): [number, number] | null {
  for (let y = r; y <= hM - r + 1e-6; y += step)
    for (let x = r; x <= wM - r + 1e-6; x += step)
      if (fits(x, y, r, placed, obstacles)) return [x, y];
  return null;
}

function greedy(
  wM: number,
  hM: number,
  sizes: PivotSize[],
  obstacles: Obstacle[],
): Placement[] {
  const placed: Placement[] = [];
  for (const size of sizes) {
    const r = radiusM(size);
    if (2 * r > wM || 2 * r > hM) continue;
    const step = Math.max(8, r / 5);
    let spot: [number, number] | null;
    while ((spot = findSpot(wM, hM, r, step, placed, obstacles))) {
      placed.push({ x: spot[0], y: spot[1], r, size });
    }
  }
  return placed;
}

/** Best obstacle-aware layout: max irrigated area, then min installed cost. */
export function placePivots(
  wM: number,
  hM: number,
  obstacles: Obstacle[],
  maxSize: PivotSize,
): Placement[] {
  const allowed = INVENTORY.filter((s) => s <= maxSize) as PivotSize[];
  if (allowed.length === 0) return [];
  const orderings: PivotSize[][] = [
    [...allowed].sort((a, b) => b - a), // largest first
    [30, 40, 25, 50, 20].filter((s) => allowed.includes(s as PivotSize)) as PivotSize[],
    [40, 30, 50, 25, 20].filter((s) => allowed.includes(s as PivotSize)) as PivotSize[],
  ];
  let best: Placement[] = [];
  let bestArea = -1;
  let bestCost = Infinity;
  for (const order of orderings) {
    const p = greedy(wM, hM, order, obstacles);
    const area = p.reduce((s, q) => s + q.size, 0);
    const cost = p.reduce((s, q) => s + pivotCost(q.size), 0);
    if (area > bestArea || (area === bestArea && cost < bestCost)) {
      best = p;
      bestArea = area;
      bestCost = cost;
    }
  }
  return best;
}

export interface GeoEstimate extends EstimateResult {
  placements: Placement[];
}

/** Full estimate built from an exact geometric layout. */
export function estimateWithObstacles(args: {
  wM: number;
  hM: number;
  shape: Shape;
  crop: Crop;
  obstacles: Obstacle[];
  maxSize: PivotSize;
}): GeoEstimate {
  const { wM, hM, shape, crop, obstacles, maxSize } = args;
  const landHa = (wM * hM) / HA_M2;
  const placements = placePivots(wM, hM, obstacles, maxSize);

  const counts = new Map<PivotSize, number>();
  for (const p of placements) counts.set(p.size, (counts.get(p.size) ?? 0) + 1);
  const picks = [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([size, count]) => ({ size, count }));

  const pivotCount = placements.length;
  const irrigatedHa = placements.reduce((s, p) => s + p.size, 0);
  const grossDepthMm = (ET0_PEAK_MM * CROP_KC[crop]) / APP_EFFICIENCY;
  const dailyWaterM3 = irrigatedHa * grossDepthMm * 10;
  const flowLps = (dailyWaterM3 * 1000) / (DAILY_HOURS * 3600);
  const costIndex = placements.reduce((s, p) => s + pivotCost(p.size), 0);
  const smallPlanMachines = Math.floor((landHa * 0.9) / cellHa(20));

  return {
    landHa,
    usableBlockHa: landHa,
    shape,
    widthM: wM,
    heightM: hM,
    effectiveMaxSize: maxSize,
    picks,
    pivotCount,
    irrigatedHa,
    efficiencyPct: landHa > 0 ? (irrigatedHa / landHa) * 100 : 0,
    wasteHa: Math.max(0, landHa - irrigatedHa),
    grossDepthMm,
    dailyWaterM3,
    flowLps,
    costIndex,
    costPerHaIndex: irrigatedHa > 0 ? costIndex / irrigatedHa : 0,
    smallPlanMachines,
    machinesSaved: Math.max(0, smallPlanMachines - pivotCount),
    feasible: pivotCount > 0,
    note:
      pivotCount > 0
        ? "ok"
        : Math.min(wM, hM) < 2 * radiusM(20)
          ? "too-narrow"
          : "too-small",
    placements,
  };
}
