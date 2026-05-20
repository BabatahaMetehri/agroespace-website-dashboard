const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
  'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];
const TENS = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', '', 'quatre-vingt', '',
];

/** Spell an integer 0..999 in French. `pluralizeTrailingCent` controls cents pluralization. */
function spellBelowThousand(n: number, pluralizeTrailingCent: boolean): string {
  if (n === 0) return '';
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds > 0) {
    if (hundreds === 1) {
      parts.push('cent');
    } else {
      // "cents" only when 'cent' is the final word of the whole number.
      const centWord = rest === 0 && pluralizeTrailingCent ? 'cents' : 'cent';
      parts.push(`${UNITS[hundreds]} ${centWord}`);
    }
  }

  if (rest > 0) parts.push(spellTwoDigits(rest));
  return parts.join(' ');
}

/** Spell 1..99 in French with proper 70/80/90 and "et un / et onze" rules. */
function spellTwoDigits(n: number): string {
  if (n < 20) return UNITS[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;

  // 70-79 -> soixante + (10..19); 90-99 -> quatre-vingt + (10..19)
  if (tens === 7 || tens === 9) {
    const base = tens === 7 ? 'soixante' : 'quatre-vingt';
    if (unit === 0) return tens === 7 ? 'soixante-dix' : 'quatre-vingt-dix';
    if (unit === 1 && tens === 7) return 'soixante et onze';
    return `${base}-${UNITS[10 + unit]}`;
  }

  const tensWord = tens === 8 ? 'quatre-vingt' : TENS[tens];
  if (unit === 0) {
    // 80 -> "quatre-vingts" (plural), others (20,30..60) stay singular.
    return tens === 8 ? 'quatre-vingts' : tensWord;
  }
  if (unit === 1 && tens !== 8) return `${tensWord} et un`;
  return `${tensWord}-${UNITS[unit]}`;
}

/** Spell a non-negative integer in French (mille invariable, millions/milliards). */
function spellInteger(n: number): string {
  if (n === 0) return 'zéro';
  const groups: number[] = [];
  let rem = n;
  while (rem > 0) {
    groups.push(rem % 1000);
    rem = Math.floor(rem / 1000);
  }
  // groups[0] = units, [1] = thousands, [2] = millions, [3] = billions
  const scaleNames = ['', 'mille', 'million', 'milliard', 'billion'];
  const out: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    if (i === 1) {
      // "mille" is invariable and "un mille" -> "mille"
      // pluralizeTrailingCent=false: "cent" never pluralizes before "mille"
      out.push(g === 1 ? 'mille' : `${spellBelowThousand(g, false)} mille`);
    } else if (i >= 2) {
      const name = scaleNames[i];
      const plural = g > 1 ? `${name}s` : name;
      // pluralizeTrailingCent=false: "cent" never pluralizes before "millions"/"milliards"
      out.push(`${spellBelowThousand(g, false)} ${plural}`);
    } else {
      out.push(spellBelowThousand(g, true));
    }
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

export interface NumberToWordsOptions {
  /** 'long' -> "dinars algériens" (default); 'short' -> "DA". */
  currency?: 'long' | 'short';
}

/**
 * Convert an amount to capitalized French words with Algerian dinar suffix.
 * Centimes (the .xx part) are appended as "... et NN centimes" when non-zero.
 */
export function numberToFrenchWords(
  amount: number,
  opts: NumberToWordsOptions = {},
): string {
  const currency = opts.currency ?? 'long';
  const safe = Math.max(0, Number(amount) || 0);
  const dinars = Math.floor(round2Local(safe));
  const centimes = Math.round((round2Local(safe) - dinars) * 100);

  const dinarWords = spellInteger(dinars);
  const dinarUnit =
    currency === 'short' ? 'DA' : dinars > 1 ? 'dinars algériens' : 'dinar algérien';

  let result = `${dinarWords} ${dinarUnit}`;
  if (centimes > 0) {
    const centWord = centimes > 1 ? 'centimes' : 'centime';
    result += ` et ${spellBelowThousand(centimes, false)} ${centWord}`;
  }
  // Capitalize first letter only.
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function round2Local(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
