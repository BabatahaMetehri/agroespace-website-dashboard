import type { ItemRow } from './types';
import { lineMontantHT, formatMoneyFr, lineTvaRate } from './lib/calc';

const fmtPct = (rate: number) => `${Number((rate * 100).toFixed(2))} %`;

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
                // designationHtml is sanitized by RichTextEditor on edit and on finalize
                dangerouslySetInnerHTML={{ __html: it.designationHtml }}
              />
            </td>
            <td className="ctr">{it.um}</td>
            <td className="ctr">{it.qty}</td>
            <td className="num">{formatMoneyFr(it.puHT)}</td>
            <td className="ctr">{fmtPct(lineTvaRate(it))}</td>
            <td className="num">{formatMoneyFr(lineMontantHT(it.qty, it.puHT))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
