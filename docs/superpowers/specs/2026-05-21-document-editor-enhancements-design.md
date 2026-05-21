# Document editor enhancements — design

Date: 2026-05-21
Module: `src/app/admin/documents/`

Eight focused changes to the proforma/facture editor. All new persisted fields
are optional, so existing saved documents keep loading unchanged.

## 1. Rich text editor — fix Undo + custom font size

File: `RichTextEditor.tsx`

- **Bug:** the A−/A/A+ size buttons wrap the selection via manual DOM surgery
  (`range.extractContents()` + `insertNode`). The browser undo stack does not
  track manual DOM mutation, so Ctrl+Z cannot reverse a size change.
- **Fix:** apply font size through `document.execCommand('insertHTML', …)`,
  wrapping the selection's *cloned inner HTML* in
  `<span style="font-size:Npx">…</span>`. execCommand edits are undoable, and
  cloning the inner HTML (instead of `sel.toString()`) preserves bold/italic/
  lists inside the selection.
- **UI:** replace the three fixed buttons with a compact number input plus −/+
  steppers (px, clamped ~8–48). Select text, then set any size — e.g. 9–11px to
  shrink a long designation onto one page. Bold / List / Clear-format are
  unchanged (already undoable via execCommand). Applying with no selection is a
  no-op, as today.

## 2. Remise (fixed discount)

Files: `types.ts`, `lib/calc.ts`, `lib/calc.test.ts`, `TotalsBlock.tsx`,
`DocumentEditor.tsx`, `defaults.ts`.

- New optional top-level `remise?: number` on the document (applies to both
  proforma and facture). A fixed agreed amount in DA, not a percentage.
- `computeTotals(items, remise?)`:
  - `grossHT = Σ line montants`
  - `sousTotalHT = grossHT − remise` (clamped at 0)
  - The remise is spread across rate groups **proportionally** to each group's
    share of `grossHT`, so per-rate TVA stays correct. With a single rate this
    is identical to subtracting it from the one base.
  - Returns the existing fields plus `grossHT` and `remise` for display.
- `TotalsBlock`: when `remise > 0`, show `Montant HT` (gross) → `REMISE` →
  `Sous total HT` → TVA line(s) → `TOTAL TTC`. When remise is 0/absent
  (the default), the block is unchanged — no remise line appears in the PDF.
- Form: a "Remise (DA)" number input, default empty/0.
- `finalize` passes `remise` to `computeTotals` and persists it.

## 3. Empty articles by default

File: `defaults.ts`

- `emptyDraft` starts with `items: []`. The list renders empty; the existing
  "Ligne manuelle" button creates the first row. No editor change needed —
  `ItemRowsEditor` already maps an empty array.

## 4. Facture: Franchise note + Mode de paiement + payment date

Files: `types.ts`, `DocumentEditor.tsx`, `TotalsBlock.tsx` / `DocFooter.tsx`,
`print.css`.

- `FactureExtras` gains `franchise?: string` (multi-line), `paymentMode?: string`
  (free text — may include a cheque number), `paymentDate?: string`.
- Form: three fields under "Mentions facture".
- Print layout, matching the GHAITAOUI facture de vente:
  - **Mode de paiement** + **date** under the amount-in-words (bottom-left).
  - **Franchise note** bottom-right near the stamp/totals.
  - Each renders only when filled and only for `type === 'facture'`.

## 5. Optional blank stamp

Files: `types.ts`, `DocFooter.tsx`, `DocumentEditor.tsx`.

- New optional `stampBlank?: boolean`. Checkbox in the footer/stamp section:
  "Espace cachet vide (cachet manuel après impression)".
- Rendering precedence in `DocFooter`:
  1. `stampUrl` set → show the image (unchanged).
  2. else `stampBlank` true → reserve empty space + the "Cachet et signature"
     label, **no** dashed placeholder, leaving room to stamp by hand.
  3. else → dashed-circle placeholder (current behaviour).

## 6. Client box — pack identity fields inline

Files: `ClientBox.tsx`, `print.css`.

- CLIENT / Adresse / Wilaya stay on their own lines.
- The filled identity fields (R.C, NIF, NIS, ART, CF) flow inline with wrapping,
  separated by spacing (flex-wrap + column gap), so e.g. NIF and ART share a
  line like the attached facture — saving vertical space and avoiding awkward
  prints.

## Verification

- `npm run build` / typecheck passes.
- `calc.test.ts` extended with remise cases (single rate matching the
  proforma example: 59 500 000 − 350 000 → 59 150 000, TVA 11 238 500,
  TTC 70 388 500; plus a mixed-rate proportional case).
