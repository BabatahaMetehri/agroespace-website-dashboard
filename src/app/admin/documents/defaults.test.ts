import { describe, it, expect } from 'vitest';
import { pickPresetDefaults } from './defaults';
import type { BankPreset, FooterPreset, StampPreset, IdentityPreset } from './types';

const bank = (id: number, isDefault?: boolean): BankPreset =>
  ({ id, label: `b${id}`, bankName: `Bank ${id}`, accountLine: `ACC-${id}`, isDefault });
const footer = (id: number, isDefault?: boolean): FooterPreset =>
  ({ id, label: `f${id}`, html: `<p>foot ${id}</p>`, isDefault });
const stamp = (id: number, isDefault?: boolean): StampPreset =>
  ({ id, label: `s${id}`, imageUrl: `http://img/${id}`, isDefault });
const identity = (id: number, isDefault?: boolean): IdentityPreset =>
  ({ id, label: `i${id}`, rc: `rc${id}`, artImp: `art${id}`, nif: `nif${id}`, nis: `nis${id}`, isDefault });

describe('pickPresetDefaults', () => {
  it('returns nothing when no preset is flagged default', () => {
    expect(pickPresetDefaults({ bank: [bank(1)], footer: [footer(1)], stamp: [stamp(1)], identity: [identity(1)] }))
      .toEqual({ banks: undefined, footerHtml: undefined, stampUrl: undefined, identity: undefined });
  });

  it('accumulates ALL default banks as bank lines', () => {
    const d = pickPresetDefaults({
      bank: [bank(1, true), bank(2), bank(3, true)],
      footer: [], stamp: [], identity: [],
    });
    expect(d.banks).toEqual([
      { bankName: 'Bank 1', accountLine: 'ACC-1' },
      { bankName: 'Bank 3', accountLine: 'ACC-3' },
    ]);
  });

  it('takes the first flagged footer / stamp / identity (single value)', () => {
    const d = pickPresetDefaults({
      bank: [],
      footer: [footer(1), footer(2, true), footer(3, true)],
      stamp: [stamp(9, true)],
      identity: [identity(5, true)],
    });
    expect(d.footerHtml).toBe('<p>foot 2</p>');
    expect(d.stampUrl).toBe('http://img/9');
    expect(d.identity).toEqual({ rc: 'rc5', artImp: 'art5', nif: 'nif5', nis: 'nis5' });
  });

  it('leaves banks undefined when none are flagged (so the empty draft wins)', () => {
    const d = pickPresetDefaults({ bank: [bank(1), bank(2)], footer: [], stamp: [], identity: [] });
    expect(d.banks).toBeUndefined();
  });
});
