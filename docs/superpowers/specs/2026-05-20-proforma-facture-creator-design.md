# Proforma & Facture Creator — Design

**Date:** 2026-05-20
**Status:** Approved for planning
**Owner:** Admin dashboard (AGROESPACE)

## Goal

Replace the tedious, manually-edited Logicom PDF workflow with an in-dashboard tool
that generates two document types — **Facture Proforma** and **Facture** — from a
dynamic form, producing a clean, print-accurate document that resembles the existing
Logicom "bon de livraison" but is more polished (subtle-modern, not flashy).

## Key decisions (locked)

- **Output:** Browser print (`window.print()` + `@media print` CSS). HTML/Tailwind doc,
  selectable text, native page breaks, no heavy deps. User chooses "Save as PDF" in the
  print dialog.
- **Storage:** Supabase KV via the existing `make-server-0c561120` edge function,
  reusing `nextId`, `safeIncomingId`, `getByPrefix` and the admin pagination contract.
- **Rich text:** Lightweight `contentEditable` editor (bold, font-size, lists), storing
  sanitized HTML. No heavy RTE dependency.
- **Archive:** Full archive — every finalized document is saved (list, reopen, reprint,
  duplicate). Cancellation marks a document `cancelled` rather than deleting it.
- **Look:** "Subtle modern" — classic boxed structure, one green accent rule, dark-green
  TOTAL TTC band. (See mockup `document-v1.html`.)

## Placement & navigation

- New admin route **`/admin/documents`**; sidebar entry "Factures & Proformas".
- Follows existing admin conventions: `AdminHeader`, toolbar, paginated list, drawer/editor.

## Surfaces

1. **Document list** — paginated table: type, displayId, client, date, total TTC, status.
   Smart-windowed pagination + search (same shape as Products/Blog). Row actions:
   open, duplicate, print, cancel.
2. **Editor** — two-pane: **form (left) + live print-accurate preview (right)**. The
   preview *is* the printed document. Stacks on small screens.
3. **Settings / Presets modal** — "Paramètres & Préréglages": company header identity and
   preset libraries, collapsed/out of the way by default.

## Data model (Supabase KV)

Counters (atomic via `nextId`):
```
counter:proforma   → sequential int  (rendered "0133", 4-digit zero-pad)
counter:facture    → sequential int  (rendered "00003", 5-digit zero-pad)
```

Records:
```
doc:<id>               → full saved document (shape below)
docpreset:bank:<id>    → { id, label, bankName, accountLine }
docpreset:footer:<id>  → { id, label, html }
docpreset:product:<id> → { id, label, ref, designationHtml, um, defaultPU }
docpreset:stamp:<id>   → { id, label, imageUrl }      // imgBB upload, like Featured
docsettings:company    → singleton: header identity + R.C / ART.IMP / NIF / NIS + logos
```

Saved document record:
```ts
{
  id: number,
  type: 'proforma' | 'facture',
  number: number,                 // 133
  year: number,                   // 26
  displayId: string,              // 'P0133/26' or '00003/26'
  status: 'finalized' | 'cancelled',
  wilayaCity: string,             // "MENIAA" / "ADRAR" — the "<city> le : <date>" prefix
  date: string,                   // ISO; creation/issue date
  validUntil: string,             // ISO; defaults to date + 15 days, overridable
  client: { name, adresse, wilaya, rc, nif, nis, art, ia },
  items: Array<{ ref: string, designationHtml: string, um: string, qty: number, puHT: number }>,
  factureExtras?: {               // facture-only, optional
    orderNo?: string,             // "N° d'ordre ..."
    contractNo?: string,          // "Contrat N° ..."
    objet?: string,               // free description block
    retenueGarantiePct?: number   // e.g. 10
  },
  bank: { bankName, accountLine },          // snapshot
  footerHtml: string,                       // snapshot
  stampUrl: string,                         // snapshot
  companySnapshot: { /* header identity at save time */ },
  totals: { sousTotalHT, tva, totalTTC },   // stored rounded; recomputed on load
  amountInWords: string,
  created_at: string,
  updated_at: string
}
```

**Snapshot principle:** company header, bank, footer, and stamp are copied into the
document at save time, so editing presets later never alters historical documents.

## ID generation & increment timing

- Counter increments **on first finalize/save**, never on preview.
- While drafting, preview shows the projected next ID, clearly marked provisional.
- Year = two-digit current year derived from `date`.
- Proforma: `P` + 4-digit zero-pad (`P0133/26`). Facture: 5-digit zero-pad (`00003/26`).
- Server allocates the number atomically (`nextId`) — concurrent staff cannot collide.
- Cancelling a facture keeps its number (no gaps — correct for invoices); status →
  `cancelled`. Documents are not hard-deleted once finalized.

## Calculations & formatting

Single pure module `lib/calc.ts` (unit-tested):
- `montantHT = round2(qty × puHT)`
- `sousTotalHT = Σ montantHT`
- `tva = round2(sousTotalHT × 0.19)`  (TVA constant 19%)
- `totalTTC = sousTotalHT + tva`
- All money: 2 decimals, French grouping (`16 200 000.00`).
- Facture-only **Retenue de garantie** (`retenueGarantiePct % of HT`) and
  **Montant net à payer HT** block, shown only when `retenueGarantiePct` is set.

## Number → French letters

Pure module `lib/numberToWords.fr.ts` (unit-tested against PDF examples):
- Algerian dinar; handles millions, "quatre-vingts", centimes.
- Default suffix "dinars algériens".
- **Fallback to "DA"** when the rendered words would overflow the words container
  (measured against box width) — keeps the layout on one page.

Test vectors: `16 200 000.00 → "Seize millions deux cent mille dinars algériens"`;
`19 278 000.00 → "Dix-neuf millions deux cent soixante-dix-huit mille dinars algériens"`;
`335 470 950.00 → "Trois cent trente-cinq millions quatre cent soixante-dix mille neuf cent cinquante dinars algériens"`.

## Rich text (product designation)

`RichTextEditor` component:
- `contentEditable` with toolbar: bold, font-size (S/M/L), bullet list, clear formatting.
- Stores **sanitized HTML** via `lib/sanitizeHtml.ts` — whitelist: `b/strong, br, ul/li,
  p, span[style: font-size only]`. Strips everything else (XSS-safe).
- The editor and the preview render the same sanitized HTML (WYSIWYG fidelity).

## Print / pagination

- Preview pane is the document, sized to A4 with `print.css` `@media print` rules.
- "Imprimer / Enregistrer en PDF" → `window.print()`; app chrome hidden in print.
- Multi-page handling:
  - Table rows: `break-inside: avoid`; `<thead>` repeats per page.
  - Totals + footer block kept together (`break-inside: avoid`).
  - Footer flows naturally (not pinned) so a slightly tall footer does not force a blank
    second page.
  - `Page X / Y` derived from the print layout.

## Settings & presets UX

- **Company header** (logos, identifiers, capital, siège, contacts, R.C/ART.IMP/NIF/NIS)
  in the settings modal, collapsed by default.
- **Preset pickers** for Bank, Footer, Product, Stamp: dropdown ("select preset…") +
  "manage" to add/edit/delete. Selecting a product preset appends a pre-filled row
  (rich-text designation, UM, default P.U) that remains inline-editable; manual rows also
  supported.
- Logos: the two attached PNGs (Agroespace, Western) ship as repo defaults. Stamp defaults
  to the attached stamp; upload-new-as-preset via imgBB (same flow as `Featured.tsx`).

## File structure

```
src/app/admin/pages/Documents.tsx          # list + editor orchestration (route component)
src/app/admin/documents/
  DocumentEditor.tsx                        # form <-> preview workspace
  DocumentPreview.tsx                       # the printable doc (single source of layout)
  DocHeader.tsx ClientBox.tsx ItemsTable.tsx TotalsBlock.tsx DocFooter.tsx
  PresetManager.tsx CompanySettingsModal.tsx
  RichTextEditor.tsx
  lib/calc.ts                               # money math (pure, tested)
  lib/numberToWords.fr.ts                   # (pure, tested)
  lib/sanitizeHtml.ts
  lib/docApi.ts                             # typed wrappers over make-server endpoints
  print.css
```

Server (`supabase/functions/make-server-0c561120/index.ts`): new route group
`/admin/documents` (CRUD + pagination contract), `/admin/docpresets/:kind`,
`/admin/docsettings/company`. Use `safeIncomingId`/`nextId` for new resource ids and
follow the existing admin pagination response shape.

## Out of scope (YAGNI)

- Multi-currency, multi-language documents (French only for now).
- Per-line custom TVA rates (constant 19%).
- E-signature / digital certification.
- Editing a finalized document's number.

## Testing

- `lib/calc.ts` and `lib/numberToWords.fr.ts`: unit tests including the PDF example vectors
  and edge cases (zero, centimes, large millions, overflow→"DA").
- Manual: print preview matches A4, multi-page row flow, footer-doesn't-orphan, concurrent
  number allocation.
