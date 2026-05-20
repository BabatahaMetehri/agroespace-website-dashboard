import './print.css';
import type { DocumentDraft } from './types';
import { DocHeader } from './DocHeader';
import { ClientBox } from './ClientBox';
import { ItemsTable } from './ItemsTable';
import { TotalsBlock } from './TotalsBlock';
import { DocFooter } from './DocFooter';

function formatFrDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function DocumentPreview({
  draft,
  displayId,
  provisional,
}: {
  draft: DocumentDraft;
  displayId: string;
  provisional: boolean; // show "(provisoire)" next to id while not yet finalized
}) {
  const title = draft.type === 'proforma' ? 'Facture Proforma' : 'Facture';
  const proformaWord = draft.type === 'proforma' ? 'proforma' : 'facture';
  const fx = draft.factureExtras;

  return (
    <div className="print-root">
      <div className="doc">
        <DocHeader company={draft.companySnapshot} />

        <div className="id-row">
          <div>
            <div className="doc-title">
              {title} N° : {displayId}
              {provisional && <span className="provisional">(provisoire)</span>}
            </div>
            <span className="accent" />
            <div className="doc-date sans">
              {draft.wilayaCity} le : {formatFrDate(draft.date)}
            </div>
            {draft.type === 'facture' && fx && (fx.orderNo || fx.contractNo || fx.objet) && (
              <div className="facture-extras sans">
                {fx.orderNo && <div>N° d'ordre {fx.orderNo}</div>}
                {fx.contractNo && <div>Contrat N° {fx.contractNo}</div>}
                {fx.objet && <div>{fx.objet}</div>}
              </div>
            )}
          </div>
          <ClientBox client={draft.client} />
        </div>

        <div className="page-no sans">Page 1 / 1</div>

        <ItemsTable items={draft.items} />

        <TotalsBlock
          items={draft.items}
          docType={draft.type}
          proformaWord={proformaWord}
          factureExtras={fx}
        />

        <DocFooter
          validUntil={draft.validUntil}
          stampUrl={draft.stampUrl}
          footerHtml={draft.footerHtml}
        />
      </div>
    </div>
  );
}
