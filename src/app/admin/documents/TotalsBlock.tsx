import type { DocType, FactureExtras } from './types';
import { computeTotals, retenueGarantie, formatMoneyFr } from './lib/calc';
import { numberToFrenchWords } from './lib/numberToWords.fr';

const WORDS_OVERFLOW_LIMIT = 110; // chars; beyond this, switch suffix to "DA"

/**
 * Decide what fills the stamp area. The "Espace cachet vide" toggle wins over
 * any selected/default stamp image — so the user can always leave blank space
 * for a physical stamp, even when a default stamp preset filled the image.
 */
export function stampMode(stampUrl: string, stampBlank?: boolean): 'blank' | 'image' | 'placeholder' {
  if (stampBlank) return 'blank';
  if (stampUrl) return 'image';
  return 'placeholder';
}

function formatFrDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function TotalsBlock({
  items,
  docType,
  proformaWord,
  factureExtras,
  remise,
  stampUrl,
  stampBlank,
  validUntil,
}: {
  items: Array<{ qty: number; puHT: number; tvaRate?: number }>;
  docType: DocType;
  proformaWord: string; // "proforma" | "facture" for the "Arrêtée la présente ..." line
  factureExtras?: FactureExtras;
  remise?: number;
  stampUrl: string;
  stampBlank?: boolean;
  validUntil: string;
}) {
  const totals = computeTotals(items, remise);
  const longWords = numberToFrenchWords(totals.totalTTC, { currency: 'long' });
  const amountInWords =
    longWords.length > WORDS_OVERFLOW_LIMIT
      ? numberToFrenchWords(totals.totalTTC, { currency: 'short' })
      : longWords;

  const showRemise = totals.remise > 0;

  const pct = factureExtras?.retenueGarantiePct;
  const showRetenue = docType === 'facture' && typeof pct === 'number' && pct > 0;
  const rg = showRetenue ? retenueGarantie(totals.sousTotalHT, pct!) : null;

  // Facture-only payment/franchise mentions (only when filled).
  const isFacture = docType === 'facture';
  const fx = factureExtras;
  const showPayment = isFacture && fx && (fx.paymentMode || fx.paymentDate);
  const showFranchise = isFacture && fx && fx.franchise && fx.franchise.trim();

  // Stamp area sits at the foot of the left column, right after the
  // amount-in-words / payment text — so it follows the content above instead of
  // being stranded in a full-width row near the page bottom.
  const stampContent = stampMode(stampUrl, stampBlank) === 'blank'
    ? <div className="stamp-blank" aria-hidden="true" />
    : stampMode(stampUrl, stampBlank) === 'image'
      ? <img className="stamp-img" src={stampUrl} alt="Cachet et signature" />
      : <div className="stamp-ph">Cachet &<br />signature</div>;

  return (
    <div className="totals-wrap">
      <div className="words">
        <div className="cap">Arrêtée la présente {proformaWord} à la somme de :</div>
        {amountInWords}
        {showPayment && (
          <div className="payment sans">
            {fx!.paymentMode && <div><b>Mode de paiement :</b> {fx!.paymentMode}</div>}
            {fx!.paymentDate && <div><b>Le :</b> {formatFrDate(fx!.paymentDate)}</div>}
          </div>
        )}
        <div className="stamp-wrap">
          {stampContent}
          <div className="sign-label">Cachet et signature</div>
        </div>
      </div>
      <div className="totals-col">
        <div className="totals">
          {showRemise && (
            <>
              <div className="tline"><span>Montant HT</span><span className="num">{formatMoneyFr(totals.grossHT)}</span></div>
              <div className="tline"><span>Remise</span><span className="num">{formatMoneyFr(totals.remise)}</span></div>
            </>
          )}
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
        {showFranchise && (
          <div className="franchise sans">{fx!.franchise}</div>
        )}
        <div className="validity-row">
          <div className="validity sans">Offre valable jusqu'au : {formatFrDate(validUntil)}</div>
        </div>
      </div>
    </div>
  );
}
