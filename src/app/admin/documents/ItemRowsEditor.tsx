import { Plus, Trash2 } from 'lucide-react';
import type { ItemRow, ProductPreset } from './types';
import { RichTextEditor } from './RichTextEditor';
import { lineMontantHT, formatMoneyFr, lineTvaRate } from './lib/calc';

const emptyRow = (): ItemRow => ({ ref: '', designationHtml: '', um: 'U', qty: 1, puHT: 0, tvaRate: 0.19 });
/** A row's TVA as a percentage (legacy rows without a rate default to 19). */
const tvaPctOf = (it: ItemRow): number => lineTvaRate(it) * 100;

const field = 'w-full rounded-lg bg-[#0f2618] border border-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#87A922]';
const label = 'block text-[11px] uppercase tracking-wide text-white/40 mb-1';

export function ItemRowsEditor({
  items,
  onChange,
  productPresets,
}: {
  items: ItemRow[];
  onChange: (items: ItemRow[]) => void;
  productPresets: ProductPreset[];
}) {
  const update = (i: number, patch: Partial<ItemRow>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const addManual = () => onChange([...items, emptyRow()]);
  const addFromPreset = (id: number) => {
    const p = productPresets.find((pp) => pp.id === id);
    if (!p) return;
    onChange([
      ...items,
      { ref: p.ref, designationHtml: p.designationHtml, um: p.um || 'U', qty: 1, puHT: p.defaultPU || 0, tvaRate: 0.19 },
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Common Algerian TVA rates — suggestions only; any value is allowed. */}
      <datalist id="tva-rates">
        <option value="19" />
        <option value="9" />
        <option value="0" />
      </datalist>
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Ligne {i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="text-red-300/70 hover:text-red-300" title="Supprimer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className={label}>Référence</label>
            <input className={field} value={it.ref} onChange={(e) => update(i, { ref: e.target.value })} />
          </div>
          <div>
            <label className={label}>Désignation</label>
            <RichTextEditor value={it.designationHtml} onChange={(html) => update(i, { designationHtml: html })} placeholder="Description du produit…" />
          </div>
          <div className="grid grid-cols-5 gap-2">
            <div>
              <label className={label}>UM</label>
              <input className={field} value={it.um} onChange={(e) => update(i, { um: e.target.value })} />
            </div>
            <div>
              <label className={label}>Quantité</label>
              <input type="number" min={0} className={field} value={it.qty}
                onChange={(e) => update(i, { qty: Number(e.target.value) })} />
            </div>
            <div>
              <label className={label}>P.U H.T</label>
              <input type="number" min={0} step="0.01" className={field} value={it.puHT}
                onChange={(e) => update(i, { puHT: Number(e.target.value) })} />
            </div>
            <div>
              <label className={label}>TVA %</label>
              <input type="number" min={0} max={100} step="0.5" list="tva-rates" className={field}
                value={Number((tvaPctOf(it)).toFixed(2))}
                onChange={(e) => update(i, { tvaRate: e.target.value === '' ? 0 : Number(e.target.value) / 100 })} />
            </div>
            <div>
              <label className={label}>Montant HT</label>
              <div className={`${field} text-white/60`}>{formatMoneyFr(lineMontantHT(it.qty, it.puHT))}</div>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={addManual}
          className="inline-flex items-center gap-2 rounded-lg bg-[#87A922] px-3 py-2 text-sm font-medium text-white hover:brightness-110">
          <Plus className="w-4 h-4" /> Ligne manuelle
        </button>
        {productPresets.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) { addFromPreset(Number(e.target.value)); e.target.value = ''; } }}
            className={`${field} max-w-xs`}
          >
            <option value="">+ Depuis un préréglage produit…</option>
            {productPresets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}
