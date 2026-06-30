/**
 * Smart Irrigation Pivot Estimator — pure calculation core.
 *
 * Everything here is deterministic and side-effect-free so it can be unit
 * tested and run entirely in the browser (no backend calls). The UI layer
 * (Estimator.tsx) only renders what these functions return.
 *
 * THE MODEL (see /estimator for the prose explanation):
 *  · A pivot's "coverage" is the area of the CIRCLE it waters.
 *  · A circle fills π/4 ≈ 78.5 % of its bounding square — the four corners are
 *    the classic un-irrigated waste. So a pivot of coverage X ha occupies a
 *    square land cell of (1/0.785)·X ≈ 1.273·X ha and waters X of it.
 *  · We derate the parcel to "usable block land" by shape + obstacles, then
 *    pack inventory pivot cells into that budget (minimising leftover) to get
 *    a concrete machine mix.
 */

export const INVENTORY = [20, 25, 30, 40, 50] as const;
export type PivotSize = (typeof INVENTORY)[number];

export type Shape = "square" | "rectangular" | "narrow" | "irregular";
export type ObstacleLevel = "none" | "light" | "moderate" | "heavy";
export type Crop = "cereals" | "maize" | "potato" | "alfalfa" | "vegetables";

export const HA_M2 = 10_000;
/** Fraction of its bounding square that a circle covers. */
export const CIRCLE_IN_SQUARE = Math.PI / 4;

/** Irrigated radius (m) of a pivot from its coverage in hectares. */
export function radiusM(coverageHa: number): number {
  return Math.sqrt((coverageHa * HA_M2) / Math.PI);
}
export function diameterM(coverageHa: number): number {
  return 2 * radiusM(coverageHa);
}
/** Square land cell (ha) a pivot occupies = coverage / (π/4). */
export function cellHa(coverageHa: number): number {
  return coverageHa / CIRCLE_IN_SQUARE;
}

/** `pivot-30` etc. — matches the featured-product SKU scheme. */
export function pivotSku(size: PivotSize): string {
  return `pivot-${size}`;
}

// ── Derating factors ────────────────────────────────────────────────────────
/** Fraction of a parcel that a grid of square cells can realistically tile. */
export const SHAPE_ETA: Record<Shape, number> = {
  square: 0.95,
  rectangular: 0.9,
  narrow: 0.78,
  irregular: 0.7,
};
/** A strip can't host an 800 m-wide machine — cap pivot size by shape. */
export const SHAPE_MAX: Record<Shape, PivotSize> = {
  square: 50,
  rectangular: 50,
  narrow: 30,
  irregular: 40,
};
/** Drawn rectangle aspect (w/h) used for the visual + field dimensions. */
export const SHAPE_ASPECT: Record<Shape, number> = {
  square: 1,
  rectangular: 1.6,
  narrow: 3,
  irregular: 1.35,
};
export const OBSTACLE_ETA: Record<ObstacleLevel, number> = {
  none: 1,
  light: 0.97,
  moderate: 0.92,
  heavy: 0.85,
};

// ── Water model ─────────────────────────────────────────────────────────────
/** Mid-season crop coefficient (Kc) — representative values. */
export const CROP_KC: Record<Crop, number> = {
  cereals: 0.9,
  maize: 1.1,
  potato: 1.0,
  alfalfa: 1.05,
  vegetables: 0.95,
};
/** Reference evapotranspiration, Algerian Sahara summer peak (mm/day). */
export const ET0_PEAK_MM = 7.0;
/** Pivot application efficiency (well-designed sprinkler package). */
export const APP_EFFICIENCY = 0.85;
/** Operating hours per day used to convert daily volume → system flow. */
export const DAILY_HOURS = 22;

// ── Cost model (relative units — calibrate to real DA prices if desired) ─────
// A pivot's installed cost has a large FIXED part per machine (pivot point,
// control panel, electrical hookup, civil works, transport, installation) plus
// a per-hectare structural part. That fixed part is WHY fewer/larger machines —
// and the popular 30-ha size — come out cheaper than many small pivots for the
// same job. The optimiser uses this to break ties between equal-coverage plans.
export const MACHINE_FIXED_COST = 8;
/**
 * Per-hectare structural cost, U-shaped with its minimum at the 30-ha sweet
 * spot: the most common, best-supported size with the easiest water supply.
 * Very large pivots need heavier structures and higher pressure, nudging their
 * per-ha cost back up.
 */
export const SIZE_VAR_COST: Record<PivotSize, number> = {
  20: 1.02,
  25: 0.97,
  30: 0.9,
  40: 0.95,
  50: 1.0,
};
/** Relative installed cost of one pivot of a given size. */
export function pivotCost(size: PivotSize): number {
  return MACHINE_FIXED_COST + size * SIZE_VAR_COST[size];
}

// ── Dimension helpers (advanced width × height input) ────────────────────────
/** Classify a rectangle from its width/height aspect ratio. */
export function shapeFromAspect(aspect: number): Shape {
  if (aspect >= 2.2) return "narrow";
  if (aspect >= 1.35) return "rectangular";
  return "square";
}
/**
 * Largest inventory pivot whose irrigated diameter fits within `minDimM`
 * metres, or null if even the smallest (20 ha → 505 m) is too wide. A hard
 * geometric constraint a qualitative shape can't capture.
 */
export function maxSizeForWidth(minDimM: number): PivotSize | null {
  let best: PivotSize | null = null;
  for (const s of INVENTORY) if (diameterM(s) <= minDimM + 1e-6) best = s;
  return best;
}

// ── Packing ────────────────────────────────────────────────────────────────
export interface PivotPick {
  size: PivotSize;
  count: number;
}

function packGreedy(usableBlockHa: number, maxSize: PivotSize): PivotPick[] {
  const sizes = INVENTORY.filter((s) => s <= maxSize).sort((a, b) => b - a);
  const counts = new Map<PivotSize, number>();
  let budget = usableBlockHa;
  let guard = 0;
  while (guard++ < 1_000_000) {
    const s = sizes.find((sz) => cellHa(sz) <= budget + 1e-9);
    if (s === undefined) break;
    counts.set(s, (counts.get(s) ?? 0) + 1);
    budget -= cellHa(s);
  }
  return toPicks(counts);
}

/**
 * Lexicographic packing via unbounded knapsack on a 0.1 ha grid:
 *   1. PRIMARY — maximise irrigated coverage (== filled block area, since every
 *      pivot fills the same π/4 of its cell).
 *   2. TIE-BREAK — among equal-coverage plans, minimise installed cost
 *      (`pivotCost`), which bakes in the fixed cost per machine + the 30-ha
 *      sweet spot. So the cheapest way to water the most land wins: fewer,
 *      larger, 30-ha-leaning machines instead of many small ones.
 * Used for realistic farm sizes; very large inputs fall back to greedy.
 */
function packDP(usableBlockHa: number, maxSize: PivotSize): PivotPick[] {
  const sizes = INVENTORY.filter((s) => s <= maxSize);
  const step = 0.1;
  const B = Math.floor(usableBlockHa / step);
  if (B <= 0) return [];
  const cells = sizes.map((s) => ({
    s,
    w: Math.max(1, Math.round(cellHa(s) / step)),
    cost: pivotCost(s),
  }));
  const fill = new Float64Array(B + 1); // best filled block area (in steps)
  const cost = new Float64Array(B + 1); // installed cost achieving that fill
  const choice = new Int8Array(B + 1).fill(-1); // index into `cells`, or -1 = carry
  for (let b = 1; b <= B; b++) {
    // carry the previous best (this 0.1 ha stays empty — same fill, same cost)
    fill[b] = fill[b - 1];
    cost[b] = cost[b - 1];
    for (let i = 0; i < cells.length; i++) {
      const w = cells[i].w;
      if (w > b) continue;
      const f = fill[b - w] + w;
      const c = cost[b - w] + cells[i].cost;
      if (
        f > fill[b] + 1e-9 ||
        (Math.abs(f - fill[b]) < 1e-9 && c < cost[b] - 1e-9)
      ) {
        fill[b] = f;
        cost[b] = c;
        choice[b] = i;
      }
    }
  }
  const counts = new Map<PivotSize, number>();
  let b = B;
  while (b > 0) {
    const c = choice[b];
    if (c < 0) {
      b -= 1;
      continue;
    }
    counts.set(cells[c].s, (counts.get(cells[c].s) ?? 0) + 1);
    b -= cells[c].w;
  }
  return toPicks(counts);
}

function toPicks(counts: Map<PivotSize, number>): PivotPick[] {
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([size, count]) => ({ size, count }));
}

export function packPivots(usableBlockHa: number, maxSize: PivotSize): PivotPick[] {
  if (usableBlockHa <= 0) return [];
  return usableBlockHa <= 5000
    ? packDP(usableBlockHa, maxSize)
    : packGreedy(usableBlockHa, maxSize);
}

/** Flatten a pick list into individual sizes, largest first (for the visual). */
export function expandPicks(picks: PivotPick[]): PivotSize[] {
  const out: PivotSize[] = [];
  for (const p of [...picks].sort((a, b) => b.size - a.size)) {
    for (let i = 0; i < p.count; i++) out.push(p.size);
  }
  return out;
}

// ── Top-level estimate ──────────────────────────────────────────────────────
export interface EstimateInput {
  landHa: number;
  shape: Shape;
  obstacles: ObstacleLevel;
  crop: Crop;
  /**
   * Advanced: exact plot dimensions in metres. When BOTH are set they override
   * landHa + shape — the area, shape and the largest pivot that physically fits
   * the plot width are all derived from them.
   */
  widthM?: number;
  heightM?: number;
}

export interface EstimateResult {
  landHa: number;
  usableBlockHa: number;
  shape: Shape; // effective shape (derived from dimensions when supplied)
  widthM: number; // drawn / derived plot dimensions
  heightM: number;
  effectiveMaxSize: PivotSize; // largest size allowed by shape + plot width
  picks: PivotPick[];
  pivotCount: number;
  irrigatedHa: number;
  efficiencyPct: number; // irrigated / land
  wasteHa: number; // land − irrigated (corners + edges + obstacles)
  grossDepthMm: number; // gross daily application depth
  dailyWaterM3: number;
  flowLps: number; // suggested system flow at DAILY_HOURS h/day
  costIndex: number; // Σ pivotCost — relative installed cost
  costPerHaIndex: number; // costIndex / irrigated ha
  smallPlanMachines: number; // machines a naive all-20-ha layout would need
  machinesSaved: number; // smallPlanMachines − pivotCount (≥ 0)
  feasible: boolean;
  note?: "too-small" | "tight" | "too-narrow" | "ok";
}

export function estimate(input: EstimateInput): EstimateResult {
  const hasDims =
    !!input.widthM && !!input.heightM && input.widthM > 0 && input.heightM > 0;

  let landHa: number;
  let shape: Shape;
  let widthM: number;
  let heightM: number;
  let dimCap: PivotSize | null = null;

  if (hasDims) {
    widthM = input.widthM as number;
    heightM = input.heightM as number;
    landHa = (widthM * heightM) / HA_M2;
    shape = shapeFromAspect(
      Math.max(widthM, heightM) / Math.min(widthM, heightM),
    );
    dimCap = maxSizeForWidth(Math.min(widthM, heightM));
  } else {
    landHa = Math.max(0, input.landHa || 0);
    shape = input.shape;
    const d = fieldDims(landHa, shape);
    widthM = d.wM;
    heightM = d.hM;
  }

  const usableBlockHa = landHa * SHAPE_ETA[shape] * OBSTACLE_ETA[input.obstacles];
  const effectiveMaxSize: PivotSize =
    hasDims && dimCap
      ? (Math.min(SHAPE_MAX[shape], dimCap) as PivotSize)
      : SHAPE_MAX[shape];

  const water = (irrigatedHa: number) => {
    const etc = ET0_PEAK_MM * CROP_KC[input.crop];
    const grossDepthMm = etc / APP_EFFICIENCY;
    // 1 mm of depth over 1 ha = 10 m³.
    const dailyWaterM3 = irrigatedHa * grossDepthMm * 10;
    const flowLps = (dailyWaterM3 * 1000) / (DAILY_HOURS * 3600);
    return { grossDepthMm, dailyWaterM3, flowLps };
  };

  const base = { landHa, usableBlockHa, shape, widthM, heightM, effectiveMaxSize };

  // Dimensions given, but the plot is narrower than our smallest pivot (505 m).
  if (hasDims && dimCap === null) {
    return {
      ...base,
      picks: [],
      pivotCount: 0,
      irrigatedHa: 0,
      efficiencyPct: 0,
      wasteHa: landHa,
      ...water(0),
      costIndex: 0,
      costPerHaIndex: 0,
      smallPlanMachines: 0,
      machinesSaved: 0,
      feasible: false,
      note: "too-narrow",
    };
  }

  let picks = packPivots(usableBlockHa, effectiveMaxSize);
  let note: EstimateResult["note"] = "ok";
  if (picks.length === 0) {
    // Too small for even a 20-ha pivot block (~25.5 ha). If close, suggest one.
    if (landHa >= 16) {
      picks = [{ size: 20, count: 1 }];
      note = "tight";
    } else {
      note = "too-small";
    }
  }

  const pivotCount = picks.reduce((s, p) => s + p.count, 0);
  let irrigatedHa = picks.reduce((s, p) => s + p.size * p.count, 0);
  if (note === "tight") irrigatedHa = Math.min(irrigatedHa, landHa);

  const efficiencyPct = landHa > 0 ? (irrigatedHa / landHa) * 100 : 0;
  const wasteHa = Math.max(0, landHa - irrigatedHa);
  const costIndex = picks.reduce((s, p) => s + pivotCost(p.size) * p.count, 0);
  const costPerHaIndex = irrigatedHa > 0 ? costIndex / irrigatedHa : 0;
  // How many machines a naive "just buy 20-ha pivots" layout would need —
  // the tangible saving from our cost-aware mix.
  const smallPlanMachines = Math.floor(usableBlockHa / cellHa(20));
  const machinesSaved = Math.max(0, smallPlanMachines - pivotCount);

  return {
    ...base,
    picks,
    pivotCount,
    irrigatedHa,
    efficiencyPct,
    wasteHa,
    ...water(irrigatedHa),
    costIndex,
    costPerHaIndex,
    smallPlanMachines,
    machinesSaved,
    feasible: pivotCount > 0,
    note,
  };
}

/** Real field dimensions (m) for the drawn parcel, from area + shape aspect. */
export function fieldDims(landHa: number, shape: Shape): { wM: number; hM: number } {
  const aspect = SHAPE_ASPECT[shape];
  const areaM2 = Math.max(0, landHa) * HA_M2;
  const hM = Math.sqrt(areaM2 / aspect);
  return { wM: hM * aspect, hM };
}
