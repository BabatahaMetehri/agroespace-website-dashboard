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
  footerHtml,
}: {
  validUntil: string;
  stampUrl: string;
  footerHtml: string;
}) {
  return (
    <>
      <div className="sign-row">
        <div>
          {stampUrl
            ? <img className="stamp-img" src={stampUrl} alt="Cachet et signature" />
            : <div className="stamp-ph">Cachet &<br />signature</div>}
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
