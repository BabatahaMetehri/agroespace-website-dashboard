import type { DocType, FactureExtras } from './types';
import { computeTotals, retenueGarantie, formatMoneyFr } from './lib/calc';
import { numberToFrenchWords } from './lib/numberToWords.fr';

const WORDS_OVERFLOW_LIMIT = 110; // chars; beyond this, switch suffix to "DA"

export function TotalsBlock({
  items,
  docType,
  proformaWord,
  factureExtras,
}: {
  items: Array<{ qty: number; puHT: number }>;
  docType: DocType;
  proformaWord: string; // "proforma" | "facture" for the "Arrêtée la présente ..." line
  factureExtras?: FactureExtras;
}) {
  const totals = computeTotals(items);
  const longWords = numberToFrenchWords(totals.totalTTC, { currency: 'long' });
  const amountInWords =
    longWords.length > WORDS_OVERFLOW_LIMIT
      ? numberToFrenchWords(totals.totalTTC, { currency: 'short' })
      : longWords;

  const pct = factureExtras?.retenueGarantiePct;
  const showRetenue = docType === 'facture' && typeof pct === 'number' && pct > 0;
  const rg = showRetenue ? retenueGarantie(totals.sousTotalHT, pct!) : null;

  return (
    <div className="totals-wrap">
      <div className="words">
        <div className="cap">Arrêtée la présente {proformaWord} à la somme de :</div>
        {amountInWords}
      </div>
      <div className="totals">
        <div className="tline"><span>Sous total HT</span><span className="num">{formatMoneyFr(totals.sousTotalHT)}</span></div>
        {totals.tvaByRate.map((l) => (
          <div className="tline" key={l.rate}>
            <span>T.V.A ({Number((l.rate * 100).toFixed(2))} %)</span>
            <span className="num">{formatMoneyFr(l.amount)}</span>
          </div>
        ))}
        <div className="grand"><span>TOTAL TTC</span><span className="num">{formatMoneyFr(totals.totalTTC)}</span></div>
        {rg && (
          <div className="retenue">
            <div className="tline"><span>Retenue garantie ({pct}%)</span><span className="num">{formatMoneyFr(rg.retenue)}</span></div>
            <div className="tline"><span>Montant net à payer HT</span><span className="num">{formatMoneyFr(rg.netHT)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
