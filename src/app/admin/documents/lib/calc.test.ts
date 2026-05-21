import { describe, it, expect } from 'vitest';
import {
  round2,
  lineMontantHT,
  computeTotals,
  retenueGarantie,
  formatMoneyFr,
  TVA_RATE,
} from './calc';

describe('round2', () => {
  it('rounds to two decimals avoiding float drift', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(2.005)).toBe(2.01);
    expect(round2(16200000)).toBe(16200000);
  });
});

describe('lineMontantHT', () => {
  it('multiplies qty by unit price, rounded', () => {
    expect(lineMontantHT(2, 8100000)).toBe(16200000);
    expect(lineMontantHT(3, 33.33)).toBe(99.99);
  });
});

describe('TVA_RATE', () => {
  it('TVA_RATE is 0.19', () => {
    expect(TVA_RATE).toBe(0.19);
  });
});

describe('computeTotals', () => {
  it('sums lines, applies 19% TVA, totals TTC', () => {
    const t = computeTotals([{ qty: 2, puHT: 8100000 }]);
    expect(t.sousTotalHT).toBe(16200000);
    expect(t.tva).toBe(3078000);
    expect(t.totalTTC).toBe(19278000);
  });
  it('handles multiple lines', () => {
    const t = computeTotals([
      { qty: 1, puHT: 100 },
      { qty: 2, puHT: 50.5 },
    ]);
    expect(t.sousTotalHT).toBe(201);
    expect(t.tva).toBe(38.19);
    expect(t.totalTTC).toBe(239.19);
  });
  it('returns zero totals for empty items array', () => {
    expect(computeTotals([])).toEqual({ grossHT: 0, remise: 0, sousTotalHT: 0, tva: 0, totalTTC: 0, tvaByRate: [] });
  });
  it('defaults missing tvaRate to 19% and reports a single rate line', () => {
    const t = computeTotals([{ qty: 2, puHT: 8100000 }]);
    expect(t.tvaByRate).toEqual([{ rate: 0.19, base: 16200000, amount: 3078000 }]);
  });
  it('supports per-line TVA rates and splits TVA per distinct rate', () => {
    const t = computeTotals([
      { qty: 1, puHT: 1000, tvaRate: 0.19 },
      { qty: 1, puHT: 1000, tvaRate: 0.09 },
    ]);
    expect(t.sousTotalHT).toBe(2000);
    expect(t.tva).toBe(280); // 190 + 90
    expect(t.totalTTC).toBe(2280);
    expect(t.tvaByRate).toEqual([
      { rate: 0.19, base: 1000, amount: 190 },
      { rate: 0.09, base: 1000, amount: 90 },
    ]);
  });

  it('applies a fixed remise before TVA (single rate — proforma example)', () => {
    // 7 × 8 500 000 = 59 500 000 gross; remise 350 000 → 59 150 000 base.
    const t = computeTotals([{ qty: 7, puHT: 8500000, tvaRate: 0.19 }], 350000);
    expect(t.grossHT).toBe(59500000);
    expect(t.remise).toBe(350000);
    expect(t.sousTotalHT).toBe(59150000);
    expect(t.tva).toBe(11238500);
    expect(t.totalTTC).toBe(70388500);
    expect(t.tvaByRate).toEqual([{ rate: 0.19, base: 59150000, amount: 11238500 }]);
  });

  it('treats remise of 0 / undefined as no discount', () => {
    const a = computeTotals([{ qty: 2, puHT: 8100000 }]);
    const b = computeTotals([{ qty: 2, puHT: 8100000 }], 0);
    expect(a.grossHT).toBe(16200000);
    expect(a.remise).toBe(0);
    expect(a.sousTotalHT).toBe(16200000);
    expect(b).toEqual(a);
  });

  it('clamps a remise larger than the gross total to the total', () => {
    const t = computeTotals([{ qty: 1, puHT: 1000 }], 5000);
    expect(t.remise).toBe(1000);
    expect(t.sousTotalHT).toBe(0);
    expect(t.tva).toBe(0);
    expect(t.totalTTC).toBe(0);
  });

  it('spreads the remise across rate groups proportionally', () => {
    // gross 2000 split 1000@19% + 1000@9%; remise 200 → 100 off each base.
    const t = computeTotals([
      { qty: 1, puHT: 1000, tvaRate: 0.19 },
      { qty: 1, puHT: 1000, tvaRate: 0.09 },
    ], 200);
    expect(t.grossHT).toBe(2000);
    expect(t.sousTotalHT).toBe(1800);
    expect(t.tvaByRate).toEqual([
      { rate: 0.19, base: 900, amount: 171 },
      { rate: 0.09, base: 900, amount: 81 },
    ]);
    expect(t.tva).toBe(252);
    expect(t.totalTTC).toBe(2052);
  });
});

describe('retenueGarantie', () => {
  it('computes retenue and net HT', () => {
    const r = retenueGarantie(372745500, 10);
    expect(r.retenue).toBe(37274550);
    expect(r.netHT).toBe(335470950);
  });
});

describe('formatMoneyFr', () => {
  it('groups thousands with spaces and keeps 2 decimals', () => {
    expect(formatMoneyFr(16200000)).toBe('16 200 000.00');
    expect(formatMoneyFr(19278000)).toBe('19 278 000.00');
    expect(formatMoneyFr(0)).toBe('0.00');
    expect(formatMoneyFr(1234.5)).toBe('1 234.50');
  });
  it('returns "0.00" for non-finite inputs', () => {
    expect(formatMoneyFr(NaN)).toBe('0.00');
    expect(formatMoneyFr(Infinity)).toBe('0.00');
    expect(formatMoneyFr(-Infinity)).toBe('0.00');
  });
});
