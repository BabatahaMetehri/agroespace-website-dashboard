function formatFrDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function DocFooter({
  validUntil,
  stampUrl,
  stampBlank,
  footerHtml,
}: {
  validUntil: string;
  stampUrl: string;
  stampBlank?: boolean;
  footerHtml: string;
}) {
  // Stamp area precedence: an uploaded image wins; otherwise either a blank
  // reserved space (for a physical stamp applied after printing) or the
  // dashed-circle placeholder.
  const stampContent = stampUrl
    ? <img className="stamp-img" src={stampUrl} alt="Cachet et signature" />
    : stampBlank
      ? <div className="stamp-blank" aria-hidden="true" />
      : <div className="stamp-ph">Cachet &<br />signature</div>;

  return (
    <>
      <div className="sign-row">
        <div className="stamp-wrap">
          {stampContent}
          <div className="sign-label">Cachet et signature</div>
        </div>
        <div className="validity sans">Offre valable jusqu'au : {formatFrDate(validUntil)}</div>
      </div>
      {footerHtml && (
        <div className="foot-notes" dangerouslySetInnerHTML={{ __html: footerHtml }} />
      )}
    </>
  );
}
