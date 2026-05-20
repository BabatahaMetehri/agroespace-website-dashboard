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
  return (
    <div className="client-box sans">
      <span className="lbl">Marchandises livrées à</span>
      {client.name && <div className="crow"><b>CLIENT :</b> {client.name}</div>}
      {client.adresse && <div className="crow"><b>ADRESSE :</b> {client.adresse}</div>}
      {client.wilaya && <div className="crow"><b>WILAYA :</b> {client.wilaya}</div>}
      {idRows.filter(([, v]) => v).map(([label, v]) => (
        <div className="crow" key={label}><b>{label} :</b> {v}</div>
      ))}
    </div>
  );
}
