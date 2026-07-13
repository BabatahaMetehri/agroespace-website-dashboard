import './print.css';
import type { DocumentDraft } from './types';
import { normalizeBanks } from './defaults';
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
}: {
  draft: DocumentDraft;
  displayId: string;
}) {
  const title = draft.type === 'proforma' ? 'Facture Proforma' : 'Facture';
  const proformaWord = draft.type === 'proforma' ? 'proforma' : 'facture';
  const fx = draft.factureExtras;

  return (
    <div className="print-root">
      <div className="doc">
        <DocHeader company={draft.companySnapshot} banks={normalizeBanks(draft)} />

        <div className="id-row">
          <div>
            <div className="doc-title">
              {title} N° : {displayId}
              <span className="accent" />
            </div>
            <div className="doc-date sans">
              {draft.wilayaCity} le : {formatFrDate(draft.date)}
            </div>
            {draft.type === 'facture' && fx && (fx.notesHtml || fx.orderNo || fx.contractNo || fx.objet) && (
              <div className="facture-extras sans">
                {fx.notesHtml && <div dangerouslySetInnerHTML={{ __html: fx.notesHtml }} />}
                {fx.orderNo && <div>N° d'ordre {fx.orderNo}</div>}
                {fx.contractNo && <div>Contrat N° {fx.contractNo}</div>}
                {fx.objet && <div>{fx.objet}</div>}
              </div>
            )}
          </div>
          <ClientBox client={draft.client} type={draft.type} />
        </div>

        <ItemsTable items={draft.items} />

        <TotalsBlock
          items={draft.items}
          docType={draft.type}
          proformaWord={proformaWord}
          factureExtras={fx}
          remise={draft.remise}
          stampUrl={draft.stampUrl}
          stampBlank={draft.stampBlank}
          validUntil={draft.validUntil}
        />

        <DocFooter footerHtml={draft.footerHtml} />
      </div>
    </div>
  );
}
