import { describe, it, expect } from "vitest";
import {
  INVENTORY,
  CIRCLE_IN_SQUARE,
  radiusM,
  diameterM,
  cellHa,
  pivotSku,
  packPivots,
  expandPicks,
  estimate,
  fieldDims,
  pivotCost,
  maxSizeForWidth,
  shapeFromAspect,
  SHAPE_MAX,
  type EstimateInput,
} from "./pivotEstimator";

describe("geometry", () => {
  it("derives the irrigated radius from coverage", () => {
    // 50 ha circle ≈ 399 m radius (matches the '400 m reach' spec)
    expect(radiusM(50)).toBeCloseTo(398.9, 0);
    expect(diameterM(50)).toBeCloseTo(797.9, 0);
    expect(radiusM(20)).toBeCloseTo(252.3, 0);
  });

  it("a pivot occupies a square cell = coverage / (π/4)", () => {
    expect(cellHa(30)).toBeCloseTo(38.2, 1);
    expect(cellHa(50)).toBeCloseTo(63.66, 1);
    // cell is always larger than coverage (corner waste)
    for (const s of INVENTORY) expect(cellHa(s)).toBeGreaterThan(s);
  });

  it("builds the right SKU", () => {
    expect(pivotSku(30)).toBe("pivot-30");
    expect(pivotSku(50)).toBe("pivot-50");
  });
});

describe("packPivots", () => {
  it("returns nothing when the budget can't hold the smallest pivot", () => {
    expect(packPivots(10, 50)).toEqual([]);
  });

  it("prefers one large pivot over several small ones at equal coverage", () => {
    // 64 ha block: a lone 50 (cell 63.66) and several small combos all irrigate
    // 50 ha — the tie-break picks the single machine (lower capex).
    expect(packPivots(64, 50)).toEqual([{ size: 50, count: 1 }]);
  });

  it("maximises irrigated area, even if that means two machines", () => {
    // 70 ha block: {30,25} irrigates 55 ha, beating a lone 50 (50 ha).
    const picks = packPivots(70, 50);
    const irrigated = picks.reduce((s, p) => s + p.size * p.count, 0);
    expect(irrigated).toBeGreaterThanOrEqual(55);
  });

  it("prefers the 30-ha sweet spot when it's the cheapest equal-coverage mix", () => {
    // 76.4 ha block: 2×30 and 40+20 both irrigate 60 ha — 2×30 is cheaper.
    expect(packPivots(76.4, 50)).toEqual([{ size: 30, count: 2 }]);
  });

  it("never exceeds the block budget and respects the size cap", () => {
    const picks = packPivots(190, 30); // narrow-style cap
    const consumed = picks.reduce((s, p) => s + cellHa(p.size) * p.count, 0);
    expect(consumed).toBeLessThanOrEqual(190 + 1e-6);
    for (const p of picks) expect(p.size).toBeLessThanOrEqual(30);
  });

  it("expandPicks flattens to one entry per machine, largest first", () => {
    const flat = expandPicks([
      { size: 20, count: 2 },
      { size: 50, count: 1 },
    ]);
    expect(flat).toEqual([50, 20, 20]);
  });
});

describe("estimate", () => {
  const base: EstimateInput = {
    landHa: 200,
    shape: "square",
    obstacles: "none",
    crop: "cereals",
  };

  it("produces a realistic, physically-bounded plan for a blocky field", () => {
    const r = estimate(base);
    expect(r.feasible).toBe(true);
    expect(r.pivotCount).toBeGreaterThan(0);
    // can never irrigate more than 78.5% of the usable block land
    expect(r.irrigatedHa).toBeLessThanOrEqual(
      r.usableBlockHa * CIRCLE_IN_SQUARE + 1e-6,
    );
    // efficiency lands in the believable corner-loss band
    expect(r.efficiencyPct).toBeGreaterThan(55);
    expect(r.efficiencyPct).toBeLessThan(78.6);
    // total occupied cells fit inside the usable parcel
    const consumed = r.picks.reduce((s, p) => s + cellHa(p.size) * p.count, 0);
    expect(consumed).toBeLessThanOrEqual(r.usableBlockHa + 1e-6);
  });

  it("obstacles and awkward shapes lower the usable land", () => {
    const clean = estimate(base);
    const messy = estimate({ ...base, shape: "irregular", obstacles: "heavy" });
    expect(messy.usableBlockHa).toBeLessThan(clean.usableBlockHa);
    for (const p of messy.picks)
      expect(p.size).toBeLessThanOrEqual(SHAPE_MAX.irregular);
  });

  it("flags land too small for any pivot", () => {
    const r = estimate({ ...base, landHa: 5 });
    expect(r.feasible).toBe(false);
    expect(r.note).toBe("too-small");
    expect(r.irrigatedHa).toBe(0);
    expect(r.dailyWaterM3).toBe(0);
  });

  it("suggests a single 20-ha pivot for a borderline parcel", () => {
    const r = estimate({ ...base, landHa: 18 });
    expect(r.note).toBe("tight");
    expect(r.picks).toEqual([{ size: 20, count: 1 }]);
    expect(r.irrigatedHa).toBe(18); // capped at the actual land
  });

  it("computes coherent daily water + flow from the irrigated area", () => {
    const r = estimate(base);
    // cereals: ETc = 7.0 × 0.9 = 6.3 mm; gross = 6.3 / 0.85 ≈ 7.41 mm/day
    expect(r.grossDepthMm).toBeCloseTo(7.41, 1);
    expect(r.dailyWaterM3).toBeCloseTo(r.irrigatedHa * r.grossDepthMm * 10, 3);
    expect(r.flowLps).toBeCloseTo((r.dailyWaterM3 * 1000) / (22 * 3600), 3);
  });

  it("thirstier crops need more water for the same field", () => {
    const cereals = estimate(base);
    const maize = estimate({ ...base, crop: "maize" });
    expect(maize.dailyWaterM3).toBeGreaterThan(cereals.dailyWaterM3);
  });
});

describe("fieldDims", () => {
  it("returns dimensions whose area matches the land size", () => {
    const { wM, hM } = fieldDims(50, "rectangular");
    expect((wM * hM) / 10_000).toBeCloseTo(50, 3);
    expect(wM / hM).toBeCloseTo(1.6, 3);
  });
});

describe("cost model", () => {
  it("makes one big pivot cheaper than many small ones for the same coverage", () => {
    // Cover ~60 ha: 2×30 vs 3×20. Fewer machines = lower cost (fixed cost/machine).
    expect(2 * pivotCost(30)).toBeLessThan(3 * pivotCost(20));
  });

  it("reports the machines saved vs a naive all-20-ha layout", () => {
    const r = estimate({
      landHa: 220,
      shape: "square",
      obstacles: "none",
      crop: "cereals",
    });
    expect(r.smallPlanMachines).toBeGreaterThan(0);
    expect(r.machinesSaved).toBeGreaterThanOrEqual(0);
    expect(r.smallPlanMachines - r.pivotCount).toBe(r.machinesSaved);
    expect(r.costIndex).toBeGreaterThan(0);
    expect(r.costPerHaIndex).toBeCloseTo(r.costIndex / r.irrigatedHa, 6);
  });
});

describe("advanced dimensions (width × height)", () => {
  it("classifies shape from aspect ratio", () => {
    expect(shapeFromAspect(1.0)).toBe("square");
    expect(shapeFromAspect(1.6)).toBe("rectangular");
    expect(shapeFromAspect(3.0)).toBe("narrow");
  });

  it("caps the pivot size to what physically fits the plot width", () => {
    // 600 m min dimension: a 30-ha pivot is 618 m wide → won't fit; 25 ha (564 m) does.
    expect(maxSizeForWidth(600)).toBe(25);
    expect(maxSizeForWidth(800)).toBe(50);
    expect(maxSizeForWidth(400)).toBeNull();
  });

  it("derives area + shape + size cap from dimensions", () => {
    const r = estimate({
      landHa: 0, // ignored when dims are present
      shape: "square",
      obstacles: "none",
      crop: "cereals",
      widthM: 600,
      heightM: 600,
    });
    expect(r.landHa).toBeCloseTo(36, 3);
    expect(r.shape).toBe("square");
    expect(r.effectiveMaxSize).toBe(25);
    for (const p of r.picks) expect(p.size).toBeLessThanOrEqual(25);
    expect(r.widthM).toBeCloseTo(600, 3);
  });

  it("flags a plot too narrow for any pivot", () => {
    const r = estimate({
      landHa: 0,
      shape: "square",
      obstacles: "none",
      crop: "cereals",
      widthM: 400,
      heightM: 2000,
    });
    expect(r.feasible).toBe(false);
    expect(r.note).toBe("too-narrow");
  });
});
