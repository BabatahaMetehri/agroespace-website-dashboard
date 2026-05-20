import { describe, it, expect } from 'vitest';
import { numberToFrenchWords } from './numberToWords.fr';

describe('numberToFrenchWords — integers from the spec', () => {
  it('16 200 000', () => {
    expect(numberToFrenchWords(16200000)).toBe(
      'Seize millions deux cent mille dinars algériens',
    );
  });
  it('19 278 000', () => {
    expect(numberToFrenchWords(19278000)).toBe(
      'Dix-neuf millions deux cent soixante-dix-huit mille dinars algériens',
    );
  });
  it('335 470 950', () => {
    expect(numberToFrenchWords(335470950)).toBe(
      'Trois cent trente-cinq millions quatre cent soixante-dix mille neuf cent cinquante dinars algériens',
    );
  });
});

describe('numberToFrenchWords — French grammar edge cases', () => {
  it('handles 80 (quatre-vingts) and 81 (quatre-vingt-un)', () => {
    expect(numberToFrenchWords(80)).toBe('Quatre-vingts dinars algériens');
    expect(numberToFrenchWords(81)).toBe('Quatre-vingt-un dinars algériens');
  });
  it('handles 71 (soixante et onze) and 21 (vingt et un)', () => {
    expect(numberToFrenchWords(71)).toBe('Soixante et onze dinars algériens');
    expect(numberToFrenchWords(21)).toBe('Vingt et un dinars algériens');
  });
  it('handles plural cents (deux cents) but singular before another number', () => {
    expect(numberToFrenchWords(200)).toBe('Deux cents dinars algériens');
    expect(numberToFrenchWords(201)).toBe('Deux cent un dinars algériens');
  });
  it('handles zero and one', () => {
    expect(numberToFrenchWords(0)).toBe('Zéro dinar algérien');
    expect(numberToFrenchWords(1)).toBe('Un dinar algérien');
  });
});

describe('numberToFrenchWords — edge cases', () => {
  it('1000 uses invariable "mille" with plural suffix', () => {
    expect(numberToFrenchWords(1000)).toBe('Mille dinars algériens');
  });
  it('negative numbers clamp to zero', () => {
    expect(numberToFrenchWords(-500)).toBe('Zéro dinar algérien');
  });
  it('NaN clamps to zero', () => {
    expect(numberToFrenchWords(NaN)).toBe('Zéro dinar algérien');
  });
});

describe('numberToFrenchWords — centimes and currency option', () => {
  it('appends centimes when present', () => {
    expect(numberToFrenchWords(1234.56)).toBe(
      'Mille deux cent trente-quatre dinars algériens et cinquante-six centimes',
    );
  });
  it('short currency uses DA', () => {
    expect(numberToFrenchWords(16200000, { currency: 'short' })).toBe(
      'Seize millions deux cent mille DA',
    );
  });
});
