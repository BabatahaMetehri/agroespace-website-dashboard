import type { ItemRow } from './types';
import { lineMontantHT, formatMoneyFr, TVA_RATE } from './lib/calc';

const tvaPct = `${Math.round(TVA_RATE * 100)} %`;

export function ItemsTable({ items }: { items: ItemRow[] }) {
  return (
    <table className="items">
      <thead>
        <tr>
          <th style={{ width: '46%' }}>Référence / Désignation</th>
          <th style={{ width: '7%' }}>UM</th>
          <th style={{ width: '9%' }}>Quantité</th>
          <th style={{ width: '14%' }}>P.U H.T</th>
          <th style={{ width: '7%' }}>TVA</th>
          <th style={{ width: '17%' }}>Montant HT</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i}>
            <td>
              {it.ref && <div style={{ fontWeight: 700 }}>{it.ref}</div>}
              <div
                className="desc"
                // designationHtml is sanitized on save (sanitizeRichHtml)
                dangerouslySetInnerHTML={{ __html: it.designationHtml }}
              />
            </td>
            <td className="ctr">{it.um}</td>
            <td className="ctr">{it.qty}</td>
            <td className="num">{formatMoneyFr(it.puHT)}</td>
            <td className="ctr">{tvaPct}</td>
            <td className="num">{formatMoneyFr(lineMontantHT(it.qty, it.puHT))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
