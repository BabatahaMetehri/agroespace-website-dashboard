export const TVA_RATE = 0.19;

/** Round to 2 decimals, correcting binary float drift (e.g. 2.005 -> 2.01). */
export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/** Montant HT for one line = qty * unit price, rounded to 2 decimals. */
export const lineMontantHT = (qty: number, puHT: number): number =>
  round2((Number(qty) || 0) * (Number(puHT) || 0));

export interface Totals {
  sousTotalHT: number;
  tva: number;
  totalTTC: number;
}

export function computeTotals(
  items: Array<{ qty: number; puHT: number }>,
): Totals {
  const sousTotalHT = round2(
    items.reduce((sum, it) => sum + lineMontantHT(it.qty, it.puHT), 0),
  );
  const tva = round2(sousTotalHT * TVA_RATE);
  const totalTTC = round2(sousTotalHT + tva);
  return { sousTotalHT, tva, totalTTC };
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
