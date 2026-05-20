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
    expect(computeTotals([])).toEqual({ sousTotalHT: 0, tva: 0, totalTTC: 0 });
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
