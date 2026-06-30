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
 * Exact min-leftover packing via unbounded knapsack on a 0.1 ha grid. Because
 * every pivot has the same circle/cell ratio, minimising leftover block land
 * == maximising irrigated hectares. Used for realistic farm sizes; very large
 * inputs fall back to greedy (fragmentation is negligible at that scale).
 */
function packDP(usableBlockHa: number, maxSize: PivotSize): PivotPick[] {
  const sizes = INVENTORY.filter((s) => s <= maxSize);
  const step = 0.1;
  const B = Math.floor(usableBlockHa / step);
  if (B <= 0) return [];
  const cells = sizes.map((s) => ({ s, w: Math.max(1, Math.round(cellHa(s) / step)) }));
  const fill = new Float64Array(B + 1); // best filled area (in steps)
  const machines = new Int32Array(B + 1); // machine count for that best fill
  const choice = new Int8Array(B + 1).fill(-1); // index into `cells`, or -1 = carry
  for (let b = 1; b <= B; b++) {
    // carry the previous best (this 0.1 ha stays empty — no new machine)
    fill[b] = fill[b - 1];
    machines[b] = machines[b - 1];
    for (let i = 0; i < cells.length; i++) {
      const w = cells[i].w;
      if (w > b) continue;
      const f = fill[b - w] + w;
      const m = machines[b - w] + 1;
      // Primary: maximise irrigated area (== filled block). Tie-break: use the
      // fewest machines (lower capex / fewer drive trains).
      if (f > fill[b] || (f === fill[b] && m < machines[b])) {
        fill[b] = f;
        machines[b] = m;
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
    const cell = cells[c];
    counts.set(cell.s, (counts.get(cell.s) ?? 0) + 1);
    b -= cell.w;
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
}

export interface EstimateResult {
  landHa: number;
  usableBlockHa: number;
  picks: PivotPick[];
  pivotCount: number;
  irrigatedHa: number;
  efficiencyPct: number; // irrigated / land
  wasteHa: number; // land − irrigated (corners + edges + obstacles)
  grossDepthMm: number; // gross daily application depth
  dailyWaterM3: number;
  flowLps: number; // suggested system flow at DAILY_HOURS h/day
  feasible: boolean;
  note?: "too-small" | "tight" | "ok";
}

export function estimate(input: EstimateInput): EstimateResult {
  const landHa = Math.max(0, input.landHa || 0);
  const usableBlockHa =
    landHa * SHAPE_ETA[input.shape] * OBSTACLE_ETA[input.obstacles];
  const maxSize = SHAPE_MAX[input.shape];

  let picks = packPivots(usableBlockHa, maxSize);
  let note: EstimateResult["note"] = "ok";

  if (picks.length === 0) {
    // Too small for even a 20-ha pivot block (needs ~25.5 ha). If the parcel is
    // close, suggest a single 20-ha machine (it may slightly over/under-fill).
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

  const etc = ET0_PEAK_MM * CROP_KC[input.crop];
  const grossDepthMm = etc / APP_EFFICIENCY;
  // 1 mm of depth over 1 ha = 10 m³.
  const dailyWaterM3 = irrigatedHa * grossDepthMm * 10;
  const flowLps = (dailyWaterM3 * 1000) / (DAILY_HOURS * 3600);

  return {
    landHa,
    usableBlockHa,
    picks,
    pivotCount,
    irrigatedHa,
    efficiencyPct,
    wasteHa,
    grossDepthMm,
    dailyWaterM3,
    flowLps,
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
