/**
 * Client-side KML reader for the pivot estimator.
 *
 * The farmer draws their plot in Google Earth, exports it as a `.kml`, and
 * drops it here. We parse the first polygon, compute its true area with the
 * shoelace formula (after a local equirectangular projection to metres), and
 * guess the terrain shape from its bounding box + how "full" the polygon is.
 *
 * 100 % in-browser — no upload, no backend call, nothing leaves the device.
 * `.kmz` (zipped KML) is intentionally not handled here; we ask the user to
 * export as plain `.kml`.
 */

import { HA_M2, type Shape } from "./pivotEstimator";

export interface KmlResult {
  areaHa: number;
  shape: Shape;
  /** [lng, lat] ring, for optionally drawing the real outline. */
  points: [number, number][];
}

export function parseKml(text: string): KmlResult | null {
  try {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) return null;

    // First polygon ring we can find (outer boundary preferred).
    const coordsEl =
      doc.querySelector("Polygon coordinates") ??
      doc.querySelector("LinearRing coordinates") ??
      doc.querySelector("coordinates");
    const raw = coordsEl?.textContent?.trim();
    if (!raw) return null;

    const points = raw
      .split(/\s+/)
      .map((tok) => {
        const [lng, lat] = tok.split(",").map(Number);
        return [lng, lat] as [number, number];
      })
      .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (points.length < 3) return null;

    // Project lng/lat → metres with an equirectangular projection centred on
    // the polygon (accurate enough for a single farm plot).
    const lat0 =
      ((points.reduce((s, p) => s + p[1], 0) / points.length) * Math.PI) / 180;
    const mPerLng = 111_320 * Math.cos(lat0);
    const mPerLat = 110_540;
    const xy = points.map(
      ([lng, lat]) => [lng * mPerLng, lat * mPerLat] as [number, number],
    );

    // Shoelace area.
    let area2 = 0;
    for (let i = 0; i < xy.length; i++) {
      const [x1, y1] = xy[i];
      const [x2, y2] = xy[(i + 1) % xy.length];
      area2 += x1 * y2 - x2 * y1;
    }
    const areaM2 = Math.abs(area2) / 2;
    if (areaM2 <= 0) return null;

    // Bounding box → aspect + how completely the polygon fills it.
    const xs = xy.map((p) => p[0]);
    const ys = xy.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h));
    const fillRatio = areaM2 / Math.max(1, w * h);

    let shape: Shape;
    if (fillRatio < 0.72) shape = "irregular";
    else if (aspect >= 2.2) shape = "narrow";
    else if (aspect >= 1.35) shape = "rectangular";
    else shape = "square";

    return {
      areaHa: Math.round((areaM2 / HA_M2) * 10) / 10,
      shape,
      points,
    };
  } catch {
    return null;
  }
}
