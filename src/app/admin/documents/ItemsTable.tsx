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
        {items.map((it, i) => {
          // Lines without a price (e.g. component lines of a bundle priced on
          // line 1) show only their designation, UM and quantity — the price,
          // TVA and amount columns stay blank instead of printing "0,00".
          const hasPrice = (it.puHT ?? 0) > 0;
          return (
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
              <td className="num">{hasPrice ? formatMoneyFr(it.puHT) : ''}</td>
              <td className="ctr">{hasPrice ? fmtPct(lineTvaRate(it)) : ''}</td>
              <td className="num">{hasPrice ? formatMoneyFr(lineMontantHT(it.qty, it.puHT)) : ''}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
