import type { ClientInfo, DocType } from "./types";

export function ClientBox({
  client,
  type = "facture",
}: {
  client: ClientInfo;
  type?: DocType;
}) {
  // Identity rows only render when filled, so the box stays compact.
  const idRows: Array<[string, string]> = [
    ["R.C", client.rc],
    ["NIF", client.nif],
    ["NIS", client.nis],
    ["ART", client.art],
    ["CF", client.cf],
  ];
  // Label follows the document type: a proforma "owes" (Doit à), a facture
  // records goods already delivered (Marchandises livrées à).
  const label = type === "proforma" ? "Doit à :" : "Marchandises livrées à :";
  return (
    <div className="client-box sans">
      <span className="lbl">{label}</span>
      {client.name && (
        <div className="crow">
          <b>CLIENT :</b> {client.name}
        </div>
      )}
      {client.adresse && (
        <div className="crow">
          <b>ADRESSE :</b> {client.adresse}
        </div>
      )}
      {client.wilaya && (
        <div className="crow">
          <b>WILAYA :</b> {client.wilaya}
        </div>
      )}
      {idRows.some(([, v]) => v) && (
        <div className="crow-ids">
          {idRows
            .filter(([, v]) => v)
            .map(([label, v]) => (
              <span className="cid" key={label}>
                <b>{label} :</b> {v}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
