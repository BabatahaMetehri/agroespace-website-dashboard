import type { ClientInfo } from './types';

export function ClientBox({ client }: { client: ClientInfo }) {
  // Identity rows only render when filled, so the box stays compact.
  const idRows: Array<[string, string]> = [
    ['R.C', client.rc],
    ['NIF', client.nif],
    ['NIS', client.nis],
    ['ART', client.art],
    ['CF', client.cf],
  ];
  const filledIds = idRows.filter(([, v]) => v);
  return (
    <div className="client-box sans">
      <span className="lbl">Marchandises livrées à</span>
      {client.name && <div className="crow"><b>CLIENT :</b> {client.name}</div>}
      {client.adresse && <div className="crow"><b>ADRESSE :</b> {client.adresse}</div>}
      {client.wilaya && <div className="crow"><b>WILAYA :</b> {client.wilaya}</div>}
      {/* Identity fields flow inline and wrap, so e.g. NIF and ART share a line
          when both are filled — saving vertical space. */}
      {filledIds.length > 0 && (
        <div className="crow-ids">
          {filledIds.map(([label, v]) => (
            <span className="cid" key={label}><b>{label} :</b> {v}</span>
          ))}
        </div>
      )}
    </div>
  );
}
