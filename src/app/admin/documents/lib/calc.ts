export const TVA_RATE = 0.19;

/** Round to 2 decimals, correcting binary float drift (e.g. 2.005 -> 2.01). */
export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/** Montant HT for one line = qty * unit price, rounded to 2 decimals. */
export const lineMontantHT = (qty: number, puHT: number): number =>
  round2((Number(qty) || 0) * (Number(puHT) || 0));

/** A line's TVA rate as a fraction; legacy rows without one default to 19 %. */
export const lineTvaRate = (it: { tvaRate?: number }): number =>
  typeof it.tvaRate === 'number' && Number.isFinite(it.tvaRate) ? it.tvaRate : TVA_RATE;

export interface TvaRateLine {
  rate: number;
  base: number;
  amount: number;
}

export interface Totals {
  /** Sum of line montants before any remise. */
  grossHT: number;
  /** Fixed discount actually applied (clamped to [0, grossHT]). */
  remise: number;
  sousTotalHT: number;
  tva: number;
  totalTTC: number;
  tvaByRate: TvaRateLine[];
}

/**
 * Compute document totals. `remise` is a fixed agreed discount (DA) subtracted
 * from the gross HT total; the result is the Sous total HT on which TVA is
 * computed. When lines span several TVA rates, the remise is spread across the
 * rate groups in proportion to each group's share of the gross HT, so per-rate
 * TVA stays correct. With a single rate this equals subtracting it from the
 * one base.
 */
export function computeTotals(
  items: Array<{ qty: number; puHT: number; tvaRate?: number }>,
  remiseInput = 0,
): Totals {
  const grossHT = round2(
    items.reduce((sum, it) => sum + lineMontantHT(it.qty, it.puHT), 0),
  );

  // Clamp the remise to a sensible range; never discount more than the total.
  const remise = round2(Math.min(Math.max(Number(remiseInput) || 0, 0), grossHT));
  const sousTotalHT = round2(grossHT - remise);

  // Group taxable HT by distinct rate so each rate gets its own TVA line.
  const baseByRate = new Map<number, number>();
  for (const it of items) {
    const rate = lineTvaRate(it);
    baseByRate.set(rate, (baseByRate.get(rate) ?? 0) + lineMontantHT(it.qty, it.puHT));
  }
  // Spread the remise across rate groups proportionally to their gross share.
  const tvaByRate: TvaRateLine[] = [...baseByRate.entries()]
    .map(([rate, gross]) => {
      const share = grossHT > 0 ? gross / grossHT : 0;
      const base = round2(gross - remise * share);
      return { rate, base, amount: round2(base * rate) };
    })
    .sort((a, b) => b.rate - a.rate);

  const tva = round2(tvaByRate.reduce((sum, l) => sum + l.amount, 0));
  const totalTTC = round2(sousTotalHT + tva);
  return { grossHT, remise, sousTotalHT, tva, totalTTC, tvaByRate };
}

/** Facture-only: retenue de garantie (pct of HT) and resulting net HT. */
export function retenueGarantie(
  sousTotalHT: number,
  pct: number,
): { retenue: number; netHT: number } {
  const retenue = round2((sousTotalHT * (Number(pct) || 0)) / 100);
  return { retenue, netHT: round2(sousTotalHT - retenue) };
}

/** Format a number as "16 200 000.00" — space thousands separator, dot decimal. */
export function formatMoneyFr(n: number): string {
  if (!Number.isFinite(n)) return '0.00';
  const [int, dec] = round2(n).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped}.${dec}`;
}
