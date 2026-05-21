/**
 * Bottom-of-page notes (NB / garantie / conditions). The stamp and the
 * "Offre valable jusqu'au" badge used to live here in a full-width row, which
 * stranded them near the page bottom; they now sit inside the totals columns
 * (see TotalsBlock) so they follow the content directly above them.
 */
export function DocFooter({ footerHtml }: { footerHtml: string }) {
  if (!footerHtml) return null;
  return <div className="foot-notes" dangerouslySetInnerHTML={{ __html: footerHtml }} />;
}
