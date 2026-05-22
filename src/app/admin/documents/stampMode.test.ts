import { describe, it, expect } from 'vitest';
import { stampMode } from './TotalsBlock';

describe('stampMode', () => {
  it('shows the image when a stamp is set and not blanked', () => {
    expect(stampMode('http://img/1', false)).toBe('image');
    expect(stampMode('http://img/1', undefined)).toBe('image');
  });

  it('"Espace cachet vide" wins even over a selected/default stamp image', () => {
    expect(stampMode('http://img/1', true)).toBe('blank');
  });

  it('blanks the area when requested and no image is set', () => {
    expect(stampMode('', true)).toBe('blank');
  });

  it('falls back to the dashed placeholder when nothing is set', () => {
    expect(stampMode('', false)).toBe('placeholder');
    expect(stampMode('', undefined)).toBe('placeholder');
  });
});
