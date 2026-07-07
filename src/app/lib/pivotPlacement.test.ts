import { describe, it, expect } from "vitest";
import { placePivots, estimateWithObstacles, OBSTACLE_SPECS, type Obstacle } from "./pivotPlacement";
import { radiusM } from "./pivotEstimator";

const noOverlap = (ps: { x: number; y: number; r: number }[]) => {
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++) {
      const d = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y);
      if (d < ps[i].r + ps[j].r - 1e-6) return false;
    }
  return true;
};

describe("placePivots", () => {
  it("packs circles inside the field without overlap", () => {
    const ps = placePivots(1200, 1200, [], 50);
    expect(ps.length).toBeGreaterThan(0);
    for (const p of ps) {
      expect(p.x).toBeGreaterThanOrEqual(p.r - 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(p.r - 1e-6);
      expect(p.x).toBeLessThanOrEqual(1200 - p.r + 1e-6);
      expect(p.y).toBeLessThanOrEqual(1200 - p.r + 1e-6);
    }
    expect(noOverlap(ps)).toBe(true);
  });

  it("keeps the required clearance from point obstacles", () => {
    const obs: Obstacle[] = [{ id: "b", type: "building", x: 400, y: 400 }];
    const ps = placePivots(800, 800, obs, 50);
    for (const p of ps) {
      const d = Math.hypot(p.x - 400, p.y - 400);
      expect(d).toBeGreaterThanOrEqual(p.r + OBSTACLE_SPECS.building.r - 1e-6);
    }
  });

  it("never lets a circle cross a road strip", () => {
    const obs: Obstacle[] = [{ id: "r", type: "road", x: 600, y: 0, orient: "v" }];
    const ps = placePivots(1200, 700, obs, 50);
    expect(ps.length).toBeGreaterThan(0);
    for (const p of ps)
      expect(Math.abs(p.x - 600)).toBeGreaterThanOrEqual(p.r + OBSTACLE_SPECS.road.r - 1e-6);
  });

  it("returns nothing when the field is narrower than the smallest pivot", () => {
    expect(2 * radiusM(20)).toBeGreaterThan(400);
    expect(placePivots(400, 2000, [], 50)).toEqual([]);
  });
});

describe("estimateWithObstacles", () => {
  it("produces a coherent estimate from the layout", () => {
    const r = estimateWithObstacles({
      wM: 1000, hM: 1000, shape: "square", crop: "cereals", obstacles: [], maxSize: 50,
    });
    expect(r.feasible).toBe(true);
    expect(r.irrigatedHa).toBe(r.placements.reduce((s, p) => s + p.size, 0));
    expect(r.landHa).toBeCloseTo(100, 6);
    expect(r.dailyWaterM3).toBeCloseTo(r.irrigatedHa * r.grossDepthMm * 10, 3);
  });

  it("flags too-narrow plots", () => {
    const r = estimateWithObstacles({
      wM: 300, hM: 2000, shape: "narrow", crop: "cereals", obstacles: [], maxSize: 50,
    });
    expect(r.feasible).toBe(false);
    expect(r.note).toBe("too-narrow");
  });
});
