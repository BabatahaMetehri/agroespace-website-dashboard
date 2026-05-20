# Proforma & Facture Creator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an in-dashboard tool that generates Facture Proforma and Facture documents from a dynamic form and prints a clean, print-accurate document, replacing the manual Logicom PDF workflow.

**Architecture:** A new `/admin/documents` route with a list page and a two-pane editor (form + live print-accurate preview). Pure calculation/number-to-words/sanitize logic lives in tested modules. Persistence and atomic ID allocation use the existing Supabase `make-server-0c561120` edge function (Hono/Deno + KV), reusing `nextId` and the admin pagination contract. Printing uses `window.print()` with a dedicated print stylesheet.

**Tech Stack:** React 18 + Vite + TypeScript, Tailwind v4, `lucide-react`, `sonner`, Supabase edge function (Deno/Hono + KV), Vitest (added for the pure modules), imgBB for stamp uploads.

**Spec:** `docs/superpowers/specs/2026-05-20-proforma-facture-creator-design.md`

---

## File Structure

**New frontend files**
```
src/app/admin/pages/Documents.tsx              # route component: list <-> editor orchestration
src/app/admin/documents/
  types.ts                                      # shared TS types for documents/presets/settings
  DocumentEditor.tsx                            # form + preview workspace
  DocumentPreview.tsx                           # the printable document (single source of layout)
  DocHeader.tsx                                 # logos + company identity band
  ClientBox.tsx                                 # "Marchandises livrées à" client box
  ItemsTable.tsx                                # product table (preview render)
  TotalsBlock.tsx                               # words + totals + retenue garantie
  DocFooter.tsx                                 # validity + stamp + footer notes
  ItemRowsEditor.tsx                            # editable item rows in the form
  RichTextEditor.tsx                            # contentEditable bold/size/list editor
  PresetManager.tsx                             # add/edit/delete presets (bank/footer/product/stamp)
  CompanySettingsModal.tsx                      # company header + counter seeding
  defaults.ts                                   # DEFAULT_COMPANY, emptyDraft, addDaysIso
  lib/calc.ts                                   # money math (pure, tested)
  lib/numberToWords.fr.ts                       # French number-to-words (pure, tested)
  lib/sanitizeHtml.ts                           # HTML whitelist sanitizer (tested)
  lib/docApi.ts                                 # typed wrappers over make-server endpoints
  lib/calc.test.ts
  lib/numberToWords.fr.test.ts
  lib/sanitizeHtml.test.ts
src/app/admin/documents/print.css              # @media print + document layout styles
```

**Modified files**
```
package.json                                    # add vitest + jsdom devDeps + "test" script
vitest.config.ts                                # NEW: test runner config (jsdom)
src/app/routes.tsx                              # register /admin/documents
src/app/layouts/AdminLayout.tsx                 # add sidebar nav item
supabase/functions/make-server-0c561120/index.ts # add document/preset/settings/counter endpoints
```

---

## Phase 0 — Tooling & assets

### Task 0.1: Add Vitest test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add dev dependencies**

Run:
```bash
npm install -D vitest@2.1.8 jsdom@25.0.1
```
Expected: `package.json` `devDependencies` gains `vitest` and `jsdom`; no peer-dep errors that abort install.

- [ ] **Step 2: Add the test script**

In `package.json`, add to `"scripts"` (alongside `build` and `dev`):
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: false,
  },
});
```

- [ ] **Step 4: Verify the runner starts (no tests yet)**

Run: `npx vitest run`
Expected: exits 0 with "No test files found" (or similar). The runner is wired up.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test runner for document modules"
```

### Task 0.2: Confirm logo/stamp assets

**Files:** (read-only check, no code)

- [ ] **Step 1: Verify logo assets exist**

Run: `ls src/imports/logo-with-shadow.png src/imports/partners/western-logo.png src/imports/partners/senninger.png`
Expected: all three paths print (used by `DocHeader.tsx`).

- [ ] **Step 2: Note the default stamp**

There is no committed stamp image. The default stamp is supplied at runtime as a stamp **preset** (uploaded via imgBB in `PresetManager`). `DocFooter` renders a dashed placeholder when no stamp is selected. No commit needed.

---

## Phase 1 — Pure logic modules (TDD)

### Task 1.1: Money calculations — `lib/calc.ts`

**Files:**
- Create: `src/app/admin/documents/lib/calc.ts`
- Test: `src/app/admin/documents/lib/calc.test.ts`

- [ ] **Step 1: Write the failing test**

`src/app/admin/documents/lib/calc.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  round2,
  lineMontantHT,
  computeTotals,
  retenueGarantie,
  formatMoneyFr,
  TVA_RATE,
} from './calc';

describe('round2', () => {
  it('rounds to two decimals avoiding float drift', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(2.005)).toBe(2.01);
    expect(round2(16200000)).toBe(16200000);
  });
});

describe('lineMontantHT', () => {
  it('multiplies qty by unit price, rounded', () => {
    expect(lineMontantHT(2, 8100000)).toBe(16200000);
    expect(lineMontantHT(3, 33.33)).toBe(99.99);
  });
});

describe('computeTotals', () => {
  it('sums lines, applies 19% TVA, totals TTC', () => {
    const t = computeTotals([{ qty: 2, puHT: 8100000 }]);
    expect(t.sousTotalHT).toBe(16200000);
    expect(t.tva).toBe(3078000);
    expect(t.totalTTC).toBe(19278000);
  });
  it('handles multiple lines', () => {
    const t = computeTotals([
      { qty: 1, puHT: 100 },
      { qty: 2, puHT: 50.5 },
    ]);
    expect(t.sousTotalHT).toBe(201);
    expect(t.tva).toBe(38.19);
    expect(t.totalTTC).toBe(239.19);
  });
  it('TVA_RATE is 0.19', () => {
    expect(TVA_RATE).toBe(0.19);
  });
});

describe('retenueGarantie', () => {
  it('computes retenue and net HT', () => {
    const r = retenueGarantie(372745500, 10);
    expect(r.retenue).toBe(37274550);
    expect(r.netHT).toBe(335470950);
  });
});

describe('formatMoneyFr', () => {
  it('groups thousands with spaces and keeps 2 decimals', () => {
    expect(formatMoneyFr(16200000)).toBe('16 200 000.00');
    expect(formatMoneyFr(19278000)).toBe('19 278 000.00');
    expect(formatMoneyFr(0)).toBe('0.00');
    expect(formatMoneyFr(1234.5)).toBe('1 234.50');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/admin/documents/lib/calc.test.ts`
Expected: FAIL — cannot resolve `./calc`.

- [ ] **Step 3: Write the implementation**

`src/app/admin/documents/lib/calc.ts`:
```ts
export const TVA_RATE = 0.19;

/** Round to 2 decimals, correcting binary float drift (e.g. 2.005 -> 2.01). */
export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/** Montant HT for one line = qty * unit price, rounded to 2 decimals. */
export const lineMontantHT = (qty: number, puHT: number): number =>
  round2((Number(qty) || 0) * (Number(puHT) || 0));

export interface Totals {
  sousTotalHT: number;
  tva: number;
  totalTTC: number;
}

export function computeTotals(
  items: Array<{ qty: number; puHT: number }>,
): Totals {
  const sousTotalHT = round2(
    items.reduce((sum, it) => sum + lineMontantHT(it.qty, it.puHT), 0),
  );
  const tva = round2(sousTotalHT * TVA_RATE);
  const totalTTC = round2(sousTotalHT + tva);
  return { sousTotalHT, tva, totalTTC };
}

/** Facture-only: retenue de garantie (pct of HT) and resulting net HT. */
export function retenueGarantie(
  sousTotalHT: number,
  pct: number,
): { retenue: number; netHT: number } {
  const retenue = round2((sousTotalHT * (Number(pct) || 0)) / 100);
  return { retenue, netHT: round2(sousTotalHT - retenue) };
}

/** Format a number as "16 200 000.00" — space thousands separator, dot decimal. */
export function formatMoneyFr(n: number): string {
  const [int, dec] = round2(n).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped}.${dec}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/admin/documents/lib/calc.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/documents/lib/calc.ts src/app/admin/documents/lib/calc.test.ts
git commit -m "feat: add document money calculation module"
```

### Task 1.2: French number-to-words — `lib/numberToWords.fr.ts`

**Files:**
- Create: `src/app/admin/documents/lib/numberToWords.fr.ts`
- Test: `src/app/admin/documents/lib/numberToWords.fr.test.ts`

- [ ] **Step 1: Write the failing test**

`src/app/admin/documents/lib/numberToWords.fr.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { numberToFrenchWords } from './numberToWords.fr';

describe('numberToFrenchWords — integers from the spec', () => {
  it('16 200 000', () => {
    expect(numberToFrenchWords(16200000)).toBe(
      'Seize millions deux cent mille dinars algériens',
    );
  });
  it('19 278 000', () => {
    expect(numberToFrenchWords(19278000)).toBe(
      'Dix-neuf millions deux cent soixante-dix-huit mille dinars algériens',
    );
  });
  it('335 470 950', () => {
    expect(numberToFrenchWords(335470950)).toBe(
      'Trois cent trente-cinq millions quatre cent soixante-dix mille neuf cent cinquante dinars algériens',
    );
  });
});

describe('numberToFrenchWords — French grammar edge cases', () => {
  it('handles 80 (quatre-vingts) and 81 (quatre-vingt-un)', () => {
    expect(numberToFrenchWords(80)).toBe('Quatre-vingts dinars algériens');
    expect(numberToFrenchWords(81)).toBe('Quatre-vingt-un dinars algériens');
  });
  it('handles 71 (soixante et onze) and 21 (vingt et un)', () => {
    expect(numberToFrenchWords(71)).toBe('Soixante et onze dinars algériens');
    expect(numberToFrenchWords(21)).toBe('Vingt et un dinars algériens');
  });
  it('handles plural cents (deux cents) but singular before another number', () => {
    expect(numberToFrenchWords(200)).toBe('Deux cents dinars algériens');
    expect(numberToFrenchWords(201)).toBe('Deux cent un dinars algériens');
  });
  it('handles zero and one', () => {
    expect(numberToFrenchWords(0)).toBe('Zéro dinar algérien');
    expect(numberToFrenchWords(1)).toBe('Un dinar algérien');
  });
});

describe('numberToFrenchWords — centimes and currency option', () => {
  it('appends centimes when present', () => {
    expect(numberToFrenchWords(1234.56)).toBe(
      'Mille deux cent trente-quatre dinars algériens et cinquante-six centimes',
    );
  });
  it('short currency uses DA', () => {
    expect(numberToFrenchWords(16200000, { currency: 'short' })).toBe(
      'Seize millions deux cent mille DA',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/admin/documents/lib/numberToWords.fr.test.ts`
Expected: FAIL — cannot resolve `./numberToWords.fr`.

- [ ] **Step 3: Write the implementation**

`src/app/admin/documents/lib/numberToWords.fr.ts`:
```ts
const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
  'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];
const TENS = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', '', 'quatre-vingt', '',
];

/** Spell an integer 0..999 in French. `isFinalGroup` controls cents pluralization. */
function spellBelowThousand(n: number, pluralizeTrailingCent: boolean): string {
  if (n === 0) return '';
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds > 0) {
    if (hundreds === 1) {
      parts.push('cent');
    } else {
      // "cents" only when 'cent' is the final word of the whole number.
      const centWord = rest === 0 && pluralizeTrailingCent ? 'cents' : 'cent';
      parts.push(`${UNITS[hundreds]} ${centWord}`);
    }
  }

  if (rest > 0) parts.push(spellTwoDigits(rest));
  return parts.join(' ');
}

/** Spell 1..99 in French with proper 70/80/90 and "et un / et onze" rules. */
function spellTwoDigits(n: number): string {
  if (n < 20) return UNITS[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;

  // 70-79 -> soixante + (10..19); 90-99 -> quatre-vingt + (10..19)
  if (tens === 7 || tens === 9) {
    const base = tens === 7 ? 'soixante' : 'quatre-vingt';
    if (unit === 0) return tens === 7 ? 'soixante-dix' : 'quatre-vingt-dix';
    if (unit === 1 && tens === 7) return 'soixante et onze';
    return `${base}-${UNITS[10 + unit]}`;
  }

  const tensWord = tens === 8 ? 'quatre-vingt' : TENS[tens];
  if (unit === 0) {
    // 80 -> "quatre-vingts" (plural), others (20,30..60) stay singular.
    return tens === 8 ? 'quatre-vingts' : tensWord;
  }
  if (unit === 1 && tens !== 8) return `${tensWord} et un`;
  return `${tensWord}-${UNITS[unit]}`;
}

/** Spell a non-negative integer in French (mille invariable, millions/milliards). */
function spellInteger(n: number): string {
  if (n === 0) return 'zéro';
  const groups: number[] = [];
  let rem = n;
  while (rem > 0) {
    groups.push(rem % 1000);
    rem = Math.floor(rem / 1000);
  }
  // groups[0] = units, [1] = thousands, [2] = millions, [3] = billions
  const scaleNames = ['', 'mille', 'million', 'milliard'];
  const out: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    if (i === 1) {
      // "mille" is invariable and "un mille" -> "mille"
      out.push(g === 1 ? 'mille' : `${spellBelowThousand(g, true)} mille`);
    } else if (i >= 2) {
      const name = scaleNames[i];
      const plural = g > 1 ? `${name}s` : name;
      out.push(`${spellBelowThousand(g, true)} ${plural}`);
    } else {
      out.push(spellBelowThousand(g, true));
    }
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

export interface NumberToWordsOptions {
  /** 'long' -> "dinars algériens" (default); 'short' -> "DA". */
  currency?: 'long' | 'short';
}

/**
 * Convert an amount to capitalized French words with Algerian dinar suffix.
 * Centimes (the .xx part) are appended as "... et NN centimes" when non-zero.
 */
export function numberToFrenchWords(
  amount: number,
  opts: NumberToWordsOptions = {},
): string {
  const currency = opts.currency ?? 'long';
  const safe = Math.max(0, Number(amount) || 0);
  const dinars = Math.floor(round2Local(safe));
  const centimes = Math.round((round2Local(safe) - dinars) * 100);

  const dinarWords = spellInteger(dinars);
  const dinarUnit =
    currency === 'short' ? 'DA' : dinars > 1 ? 'dinars algériens' : 'dinar algérien';

  let result = `${dinarWords} ${dinarUnit}`;
  if (centimes > 0) {
    const centWord = centimes > 1 ? 'centimes' : 'centime';
    result += ` et ${spellBelowThousand(centimes, false)} ${centWord}`;
  }
  // Capitalize first letter only.
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function round2Local(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/admin/documents/lib/numberToWords.fr.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/documents/lib/numberToWords.fr.ts src/app/admin/documents/lib/numberToWords.fr.test.ts
git commit -m "feat: add French number-to-words module for documents"
```

### Task 1.3: HTML sanitizer — `lib/sanitizeHtml.ts`

**Files:**
- Create: `src/app/admin/documents/lib/sanitizeHtml.ts`
- Test: `src/app/admin/documents/lib/sanitizeHtml.test.ts`

- [ ] **Step 1: Write the failing test**

`src/app/admin/documents/lib/sanitizeHtml.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sanitizeRichHtml } from './sanitizeHtml';

describe('sanitizeRichHtml', () => {
  it('keeps whitelisted formatting tags', () => {
    const html = '<b>Bold</b> <strong>strong</strong><br><ul><li>a</li></ul>';
    expect(sanitizeRichHtml(html)).toBe(
      '<b>Bold</b> <strong>strong</strong><br><ul><li>a</li></ul>',
    );
  });
  it('keeps font-size style on span but strips other styles', () => {
    const html = '<span style="font-size: 18px; color: red;">big</span>';
    expect(sanitizeRichHtml(html)).toBe('<span style="font-size:18px">big</span>');
  });
  it('removes script tags and event handlers', () => {
    const html = '<b onclick="alert(1)">x</b><script>alert(2)</script>';
    expect(sanitizeRichHtml(html)).toBe('<b>x</b>');
  });
  it('unwraps disallowed tags but keeps their text', () => {
    expect(sanitizeRichHtml('<div><a href="x">link</a> text</div>')).toBe(
      'link text',
    );
  });
  it('returns empty string for empty/nullish input', () => {
    expect(sanitizeRichHtml('')).toBe('');
    expect(sanitizeRichHtml(null as unknown as string)).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/admin/documents/lib/sanitizeHtml.test.ts`
Expected: FAIL — cannot resolve `./sanitizeHtml`.

- [ ] **Step 3: Write the implementation**

`src/app/admin/documents/lib/sanitizeHtml.ts`:
```ts
const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'UL', 'OL', 'LI', 'SPAN',
]);

// Dangerous elements: drop the element AND all of its contents (otherwise
// e.g. <script>alert(1)</script> text would leak through the unwrap path).
const DROP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
  'LINK', 'META', 'BASE',
]);

/** Serialize a node's allowed children to a sanitized HTML string. */
function serializeChildren(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    out += serializeNode(child);
  });
  return out;
}

function serializeNode(node: Node): string {
  // Text node: escape the five XML-significant characters.
  if (node.nodeType === 3) {
    return (node.textContent ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  if (node.nodeType !== 1) return '';

  const el = node as Element;
  const tag = el.tagName.toUpperCase();
  if (DROP_TAGS.has(tag)) return ''; // drop element AND its contents (XSS)
  if (!ALLOWED_TAGS.has(tag)) {
    // Disallowed but safe element: drop the tag, keep sanitized children.
    return serializeChildren(el);
  }

  const lower = tag.toLowerCase();
  if (lower === 'br') return '<br>';

  // Only SPAN keeps a single allowed style: font-size.
  let attrs = '';
  if (lower === 'span') {
    const raw = (el as HTMLElement).style?.fontSize?.replace(/\s+/g, '') ?? '';
    if (/^[\d.]+(px|em|rem|%|pt)$/.test(raw)) attrs = ` style="font-size:${raw}"`;
  }
  return `<${lower}${attrs}>${serializeChildren(el)}</${lower}>`;
}

/** Whitelist-sanitize rich text HTML (bold/italic/underline/lists/span font-size). */
export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return serializeChildren(doc.body).trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/admin/documents/lib/sanitizeHtml.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/documents/lib/sanitizeHtml.ts src/app/admin/documents/lib/sanitizeHtml.test.ts
git commit -m "feat: add rich-text HTML sanitizer for documents"
```

---

## Phase 2 — Server: documents, presets, settings, counters

All endpoints go in `supabase/functions/make-server-0c561120/index.ts`, follow the
`requireAdmin` + `{ code, message }` error conventions, and reuse `nextId` / `kv`.
This phase has no unit tests (Deno edge function); verify with the deploy/smoke step at the end.

### Task 2.1: Extend ID kinds and add document key helpers

**Files:**
- Modify: `supabase/functions/make-server-0c561120/index.ts` (the `IdKind` union ~line 1438, the `nextId` `start` map ~line 1451)

- [ ] **Step 1: Add the new id kinds to the `IdKind` union**

Find:
```ts
type IdKind =
  | "product"
  | "media"
  | "category"
  | "attribute"
  | "attribute_term"
  | "customer"
  | "order";
```
Replace with:
```ts
type IdKind =
  | "product"
  | "media"
  | "category"
  | "attribute"
  | "attribute_term"
  | "customer"
  | "order"
  | "document"
  | "docpreset"
  | "proforma"
  | "facture";
```

- [ ] **Step 2: Add starting points for the new counters**

In `nextId`, find the `start` map and add three entries (leave existing ones):
```ts
  const start: Record<string, number> = {
    media: 1000,
    category: 14, // next will be 15 — matches WC default "Uncategorized" id
    customer: 1,
    order: 1,
    attribute: 0,
    attribute_term: 0,
    product: 0,
    document: 0,     // internal document record id
    docpreset: 0,    // internal preset id
    proforma: 0,     // human proforma number (seedable by admin)
    facture: 0,      // human facture number (seedable by admin)
  };
```

- [ ] **Step 3: Add document/preset key + display-id helpers**

Insert just **after** the `app.delete(\`${ADMIN}/featured/:id\` ...)` handler (~line 1432, before the "Shape helpers" comment block):
```ts
// ─── Documents (Proforma / Facture) ─────────────────────────────────────────
const DOC_PREFIX = "doc:";
const docKey = (id: number | string) => `${DOC_PREFIX}${id}`;
const docPresetPrefix = (kind: string) => `docpreset:${kind}:`;
const docPresetKey = (kind: string, id: number | string) =>
  `${docPresetPrefix(kind)}${id}`;
const COMPANY_SETTINGS_KEY = "docsettings:company";
const PRESET_KINDS = new Set(["bank", "footer", "product", "stamp"]);

function twoDigitYear(isoDate: string): string {
  const d = new Date(isoDate);
  const yy = (Number.isNaN(d.getTime()) ? new Date() : d).getFullYear() % 100;
  return String(yy).padStart(2, "0");
}

function buildDisplayId(
  type: "proforma" | "facture",
  num: number,
  isoDate: string,
): string {
  const yy = twoDigitYear(isoDate);
  return type === "proforma"
    ? `P${String(num).padStart(4, "0")}/${yy}`
    : `${String(num).padStart(5, "0")}/${yy}`;
}
```

- [ ] **Step 4: Verify the file still parses**

Run: `node -e "require('fs').readFileSync('supabase/functions/make-server-0c561120/index.ts','utf8')"`
Expected: no error (basic read). Deno type-check happens on deploy.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/make-server-0c561120/index.ts
git commit -m "feat(server): add document id kinds and key helpers"
```

### Task 2.2: Document CRUD + counters endpoints

**Files:**
- Modify: `supabase/functions/make-server-0c561120/index.ts` (append after the helpers from Task 2.1)

- [ ] **Step 1: Add the documents list + counters + CRUD endpoints**

Insert immediately after the helpers added in Task 2.1, Step 3:
```ts
// GET counters -> next number that WOULD be allocated for each type.
app.get(`${ADMIN}/doccounters`, requireAdmin, async (c) => {
  const p = ((await kv.get("counter:proforma")) as number | null) ?? 0;
  const f = ((await kv.get("counter:facture")) as number | null) ?? 0;
  return c.json({ proforma_next: p + 1, facture_next: f + 1 });
});

// PUT a counter (seed the sequence). Body: { value: number } where `value`
// is the LAST used number (next allocation = value + 1).
app.put(`${ADMIN}/doccounters/:kind`, requireAdmin, async (c) => {
  const kind = c.req.param("kind");
  if (kind !== "proforma" && kind !== "facture") {
    return c.json({ code: "rest_invalid_kind", message: "invalid counter" }, 400);
  }
  const body = await c.req.json().catch(() => ({}));
  const value = Number(body?.value);
  if (!Number.isInteger(value) || value < 0) {
    return c.json({ code: "rest_invalid_payload", message: "value must be a non-negative integer" }, 400);
  }
  await kv.set(`counter:${kind}`, value);
  return c.json({ kind, value, next: value + 1 });
});

// LIST documents (admin pagination contract).
app.get(`${ADMIN}/documents`, requireAdmin, async (c) => {
  const items = (await kv.getByPrefix(DOC_PREFIX)) as any[];

  const counts = {
    all: items.length,
    proforma: items.filter((d) => d?.type === "proforma").length,
    facture: items.filter((d) => d?.type === "facture").length,
    cancelled: items.filter((d) => d?.status === "cancelled").length,
  };

  const type = (c.req.query("type") ?? "all").toLowerCase();
  const status = (c.req.query("status") ?? "all").toLowerCase();
  const search = (c.req.query("search") ?? "").trim().toLowerCase();

  let filtered = items;
  if (type === "proforma" || type === "facture")
    filtered = filtered.filter((d) => d?.type === type);
  if (status === "finalized" || status === "cancelled")
    filtered = filtered.filter((d) => d?.status === status);
  if (search) {
    filtered = filtered.filter((d) =>
      [d?.displayId, d?.client?.name, d?.client?.wilaya]
        .filter((v) => v != null)
        .some((v: any) => String(v).toLowerCase().includes(search)),
    );
  }

  filtered.sort((a: any, b: any) =>
    String(b?.created_at ?? "").localeCompare(String(a?.created_at ?? "")),
  );

  if (c.req.query("all") === "true") return c.json(filtered);

  const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
  const perPage = Math.min(200, Math.max(1, Number(c.req.query("per_page") ?? 25) || 25));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;

  return c.json({
    items: filtered.slice(start, start + perPage),
    total,
    page: safePage,
    per_page: perPage,
    total_pages: totalPages,
    counts,
  });
});

// GET a single document.
app.get(`${ADMIN}/documents/:id`, requireAdmin, async (c) => {
  const doc = await kv.get(docKey(c.req.param("id")));
  if (!doc) return c.json({ code: "rest_not_found", message: "Document not found" }, 404);
  return c.json(doc);
});

// CREATE (finalize) a document — allocates the human number atomically.
app.post(`${ADMIN}/documents`, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const type = body?.type === "facture" ? "facture" : "proforma";
    const date = typeof body?.date === "string" ? body.date : new Date().toISOString();

    const id = await nextId("document");
    const number = await nextId(type); // increments counter:proforma / counter:facture
    const displayId = buildDisplayId(type, number, date);

    const now = new Date().toISOString();
    const doc = {
      ...body,
      id,
      type,
      number,
      year: Number(twoDigitYear(date)),
      displayId,
      status: "finalized",
      created_at: now,
      updated_at: now,
    };
    await kv.set(docKey(id), doc);
    return c.json(doc);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

// UPDATE a document (does NOT change its number/displayId).
app.put(`${ADMIN}/documents/:id`, requireAdmin, async (c) => {
  try {
    const existing = (await kv.get(docKey(c.req.param("id")))) as any | null;
    if (!existing) return c.json({ code: "rest_not_found", message: "Document not found" }, 404);
    const body = await c.req.json();
    const merged = {
      ...existing,
      ...body,
      id: existing.id,
      type: existing.type,
      number: existing.number,
      year: existing.year,
      displayId: existing.displayId,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };
    await kv.set(docKey(existing.id), merged);
    return c.json(merged);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

// CANCEL a document (keeps its number — no gaps in the invoice sequence).
app.post(`${ADMIN}/documents/:id/cancel`, requireAdmin, async (c) => {
  const existing = (await kv.get(docKey(c.req.param("id")))) as any | null;
  if (!existing) return c.json({ code: "rest_not_found", message: "Document not found" }, 404);
  existing.status = "cancelled";
  existing.updated_at = new Date().toISOString();
  await kv.set(docKey(existing.id), existing);
  return c.json(existing);
});

// DELETE a document (hard delete — for mistaken drafts only).
app.delete(`${ADMIN}/documents/:id`, requireAdmin, async (c) => {
  await kv.del(docKey(c.req.param("id")));
  return c.json({ deleted: true, id: c.req.param("id") });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/make-server-0c561120/index.ts
git commit -m "feat(server): add document CRUD and counter endpoints"
```

### Task 2.3: Preset + company settings endpoints

**Files:**
- Modify: `supabase/functions/make-server-0c561120/index.ts` (append after Task 2.2 endpoints)

- [ ] **Step 1: Add preset CRUD + company settings endpoints**

Insert immediately after the document DELETE handler:
```ts
// LIST presets of a kind (bank | footer | product | stamp).
app.get(`${ADMIN}/docpresets/:kind`, requireAdmin, async (c) => {
  const kind = c.req.param("kind");
  if (!PRESET_KINDS.has(kind)) return c.json({ code: "rest_invalid_kind", message: "invalid preset kind" }, 400);
  const items = (await kv.getByPrefix(docPresetPrefix(kind))) as any[];
  items.sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
  return c.json(items);
});

// CREATE a preset.
app.post(`${ADMIN}/docpresets/:kind`, requireAdmin, async (c) => {
  const kind = c.req.param("kind");
  if (!PRESET_KINDS.has(kind)) return c.json({ code: "rest_invalid_kind", message: "invalid preset kind" }, 400);
  try {
    const body = await c.req.json();
    const id = await nextId("docpreset");
    const preset = { ...body, id, kind };
    await kv.set(docPresetKey(kind, id), preset);
    return c.json(preset);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

// UPDATE a preset.
app.put(`${ADMIN}/docpresets/:kind/:id`, requireAdmin, async (c) => {
  const kind = c.req.param("kind");
  if (!PRESET_KINDS.has(kind)) return c.json({ code: "rest_invalid_kind", message: "invalid preset kind" }, 400);
  const existing = (await kv.get(docPresetKey(kind, c.req.param("id")))) as any | null;
  if (!existing) return c.json({ code: "rest_not_found", message: "Preset not found" }, 404);
  try {
    const body = await c.req.json();
    const merged = { ...existing, ...body, id: existing.id, kind };
    await kv.set(docPresetKey(kind, existing.id), merged);
    return c.json(merged);
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});

// DELETE a preset.
app.delete(`${ADMIN}/docpresets/:kind/:id`, requireAdmin, async (c) => {
  const kind = c.req.param("kind");
  if (!PRESET_KINDS.has(kind)) return c.json({ code: "rest_invalid_kind", message: "invalid preset kind" }, 400);
  await kv.del(docPresetKey(kind, c.req.param("id")));
  return c.json({ deleted: true, id: c.req.param("id") });
});

// GET company settings (header identity). Returns {} if never set.
app.get(`${ADMIN}/docsettings/company`, requireAdmin, async (c) => {
  const settings = (await kv.get(COMPANY_SETTINGS_KEY)) as any | null;
  return c.json(settings ?? {});
});

// PUT company settings (full replace).
app.put(`${ADMIN}/docsettings/company`, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    await kv.set(COMPANY_SETTINGS_KEY, { ...body, updated_at: new Date().toISOString() });
    return c.json(await kv.get(COMPANY_SETTINGS_KEY));
  } catch (e) {
    return c.json({ code: "rest_invalid_payload", message: String(e) }, 400);
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/make-server-0c561120/index.ts
git commit -m "feat(server): add document preset and company settings endpoints"
```

---

## Phase 3 — Shared types & frontend API client

### Task 3.1: Shared types — `types.ts`

**Files:**
- Create: `src/app/admin/documents/types.ts`

- [ ] **Step 1: Write the types**

`src/app/admin/documents/types.ts`:
```ts
export type DocType = 'proforma' | 'facture';
export type DocStatus = 'finalized' | 'cancelled';

export interface ClientInfo {
  name: string;
  adresse: string;
  wilaya: string;
  rc: string;
  nif: string;
  nis: string;
  art: string;
  ia: string;
}

export interface ItemRow {
  ref: string;
  designationHtml: string; // sanitized rich text
  um: string;
  qty: number;
  puHT: number;
}

export interface FactureExtras {
  orderNo?: string;
  contractNo?: string;
  objet?: string;
  retenueGarantiePct?: number;
}

export interface BankInfo {
  bankName: string;
  accountLine: string;
}

export interface CompanySettings {
  brandName: string;        // "AGRO ESPACE"
  tagline: string;          // "Vente de produits et matériels pour l'agriculture"
  capital: string;          // "10 000 000.00 Da"
  siege: string;
  tel: string;
  fax: string;
  email: string;
  rc: string;
  artImp: string;
  nif: string;
  nis: string;
  updated_at?: string;
}

export interface DocTotals {
  sousTotalHT: number;
  tva: number;
  totalTTC: number;
}

/** A document as stored/returned by the server. */
export interface DocumentRecord {
  id: number;
  type: DocType;
  number: number;
  year: number;
  displayId: string;
  status: DocStatus;
  wilayaCity: string;
  date: string;        // ISO
  validUntil: string;  // ISO
  client: ClientInfo;
  items: ItemRow[];
  factureExtras?: FactureExtras;
  bank: BankInfo;
  footerHtml: string;
  stampUrl: string;
  companySnapshot: CompanySettings;
  totals: DocTotals;
  amountInWords: string;
  created_at: string;
  updated_at: string;
}

/** Editor draft — same shape minus server-assigned fields. */
export type DocumentDraft = Omit<
  DocumentRecord,
  'id' | 'number' | 'year' | 'displayId' | 'status' | 'created_at' | 'updated_at'
> & {
  id?: number; // present when editing an existing finalized doc
};

export type PresetKind = 'bank' | 'footer' | 'product' | 'stamp';

export interface BankPreset { id: number; label: string; bankName: string; accountLine: string; }
export interface FooterPreset { id: number; label: string; html: string; }
export interface ProductPreset {
  id: number; label: string; ref: string; designationHtml: string; um: string; defaultPU: number;
}
export interface StampPreset { id: number; label: string; imageUrl: string; }

export interface CountersInfo { proforma_next: number; facture_next: number; }

export interface PaginatedDocuments {
  items: DocumentRecord[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  counts: { all: number; proforma: number; facture: number; cancelled: number };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | head -20` (if no `tsconfig.json`, skip — `npm run build` in a later task covers it)
Expected: no errors referencing `types.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/documents/types.ts
git commit -m "feat: add document shared types"
```

### Task 3.2: Typed API client — `lib/docApi.ts`

**Files:**
- Create: `src/app/admin/documents/lib/docApi.ts`

- [ ] **Step 1: Write the client factory**

The frontend `api(path, init?)` function comes from `useAdminAuth()` (see
`src/app/admin/auth/AuthProvider.tsx:94`). `docApi` wraps it in typed methods.

`src/app/admin/documents/lib/docApi.ts`:
```ts
import type {
  DocumentRecord,
  DocumentDraft,
  PaginatedDocuments,
  PresetKind,
  CountersInfo,
  CompanySettings,
} from '../types';

/** The shape of the `api` function provided by useAdminAuth(). */
type ApiFn = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;

export interface DocListParams {
  page?: number;
  per_page?: number;
  type?: 'all' | 'proforma' | 'facture';
  status?: 'all' | 'finalized' | 'cancelled';
  search?: string;
}

export function createDocApi(api: ApiFn) {
  const qs = (p: Record<string, unknown>) => {
    const sp = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
    });
    const s = sp.toString();
    return s ? `?${s}` : '';
  };

  return {
    // Documents
    listDocuments: (params: DocListParams = {}) =>
      api<PaginatedDocuments>(`/admin/documents${qs(params)}`),
    getDocument: (id: number) => api<DocumentRecord>(`/admin/documents/${id}`),
    createDocument: (draft: DocumentDraft) =>
      api<DocumentRecord>('/admin/documents', {
        method: 'POST',
        body: JSON.stringify(draft),
      }),
    updateDocument: (id: number, patch: Partial<DocumentRecord>) =>
      api<DocumentRecord>(`/admin/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
    cancelDocument: (id: number) =>
      api<DocumentRecord>(`/admin/documents/${id}/cancel`, { method: 'POST' }),
    deleteDocument: (id: number) =>
      api<{ deleted: boolean }>(`/admin/documents/${id}`, { method: 'DELETE' }),

    // Counters
    getCounters: () => api<CountersInfo>('/admin/doccounters'),
    setCounter: (kind: 'proforma' | 'facture', value: number) =>
      api<{ kind: string; value: number; next: number }>(
        `/admin/doccounters/${kind}`,
        { method: 'PUT', body: JSON.stringify({ value }) },
      ),

    // Presets
    listPresets: <T>(kind: PresetKind) => api<T[]>(`/admin/docpresets/${kind}`),
    createPreset: <T>(kind: PresetKind, body: Partial<T>) =>
      api<T>(`/admin/docpresets/${kind}`, { method: 'POST', body: JSON.stringify(body) }),
    updatePreset: <T>(kind: PresetKind, id: number, body: Partial<T>) =>
      api<T>(`/admin/docpresets/${kind}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deletePreset: (kind: PresetKind, id: number) =>
      api<{ deleted: boolean }>(`/admin/docpresets/${kind}/${id}`, { method: 'DELETE' }),

    // Company settings
    getCompany: () => api<CompanySettings | Record<string, never>>('/admin/docsettings/company'),
    saveCompany: (settings: CompanySettings) =>
      api<CompanySettings>('/admin/docsettings/company', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
  };
}

export type DocApi = ReturnType<typeof createDocApi>;
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/lib/docApi.ts
git commit -m "feat: add typed document API client"
```

---

## Phase 4 — Printable document & rich-text editor

### Task 4.1: Document print styles — `print.css`

**Files:**
- Create: `src/app/admin/documents/print.css`

- [ ] **Step 1: Write the stylesheet**

Styles are scoped under `.doc` (screen preview) plus a `@media print` block that hides
app chrome and sizes the page to A4. The classes match the approved mockup.

`src/app/admin/documents/print.css`:
```css
/* ── Document (screen preview + print) ─────────────────────────────────── */
.doc {
  background: #fff;
  color: #1f2a24;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 14mm 14mm 12mm;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12px;
  line-height: 1.4;
  box-sizing: border-box;
}
.doc .sans { font-family: Arial, Helvetica, sans-serif; }
.doc-hd { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.doc-hd .logo-agro { height: 46px; width: auto; object-fit: contain; }
.doc-hd .logo-western { height: 34px; width: auto; object-fit: contain; display: block; margin-left: auto; }
.doc-hd .logo-senninger { height: 18px; width: auto; object-fit: contain; display: block; margin: 4px 0 0 auto; }
.brand-name { font-size: 24px; font-weight: 700; color: #1d6b3a; letter-spacing: .5px; line-height: 1; }
.brand-sub { font-size: 11px; color: #3a4a40; margin-top: 3px; }
.brand-lines { font-size: 10px; color: #4a564d; margin-top: 6px; line-height: 1.5; }
.brand-ids { color: #6b7770; }
.rule { height: 3px; background: linear-gradient(90deg, #114232, #87A922); border-radius: 2px; margin: 12px 0 14px; }
.id-row { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
.doc-title { font-size: 18px; font-weight: 700; color: #114232; }
.doc-title .accent { display: block; height: 3px; width: 120px; background: #87A922; border-radius: 2px; margin-top: 6px; }
.doc-title .provisional { font-size: 10px; color: #b8862b; font-weight: 600; margin-left: 6px; }
.doc-date { font-size: 12px; margin-top: 10px; }
.facture-extras { font-size: 10.5px; margin-top: 8px; color: #2a3a30; max-width: 320px; }
.client-box { border: 1.5px solid #c7d0c9; border-radius: 12px; padding: 12px 16px; min-width: 300px; position: relative; }
.client-box .lbl { position: absolute; top: -9px; left: 14px; background: #fff; padding: 0 6px; font-size: 10px; color: #6b7770; }
.client-box .crow { font-size: 11.5px; margin: 2px 0; }
.client-box b { color: #1f2a24; }
.page-no { text-align: right; font-size: 10px; color: #6b7770; margin: 8px 0 4px; }
table.items { width: 100%; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif; }
table.items th { background: #f3f6f1; color: #2a3a30; font-size: 10.5px; font-weight: 700; border: 1px solid #cdd6cf; padding: 7px 8px; text-align: center; }
table.items td { border: 1px solid #dde3dd; padding: 9px; vertical-align: top; font-size: 11px; }
table.items tr { break-inside: avoid; page-break-inside: avoid; }
.desc :where(b, strong) { font-weight: 700; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ctr { text-align: center; }
.totals-wrap { display: flex; justify-content: space-between; gap: 24px; margin-top: 18px; align-items: flex-start; break-inside: avoid; page-break-inside: avoid; }
.words { font-size: 11.5px; max-width: 430px; font-family: Arial, Helvetica, sans-serif; }
.words .cap { font-weight: 700; font-size: 10.5px; color: #3a4a40; }
.totals { font-family: Arial, Helvetica, sans-serif; min-width: 250px; }
.totals .tline { display: flex; justify-content: space-between; padding: 5px 2px; font-size: 11.5px; border-bottom: 1px solid #eef0ed; }
.totals .grand { background: #114232; color: #fff; padding: 9px 12px; border-radius: 8px; margin-top: 6px; font-weight: 700; font-size: 13px; display: flex; justify-content: space-between; }
.totals .retenue { margin-top: 6px; border: 1px solid #cdd6cf; border-radius: 8px; overflow: hidden; }
.totals .retenue .tline { padding: 6px 10px; border-bottom: 1px solid #eef0ed; }
.sign-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; break-inside: avoid; page-break-inside: avoid; }
.stamp-img { width: 130px; height: auto; object-fit: contain; }
.stamp-ph { width: 120px; height: 120px; border-radius: 50%; border: 2px dashed #b9c4bc; display: flex; align-items: center; justify-content: center; color: #9aa89f; font-size: 10px; font-family: Arial; text-align: center; }
.sign-label { font-family: Arial; font-size: 11px; color: #3a4a40; margin-top: 4px; }
.validity { font-family: Arial; font-size: 11.5px; font-weight: 700; color: #114232; border: 1.5px solid #87A922; border-radius: 8px; padding: 6px 12px; }
.foot-notes { border-top: 1px solid #e3e6e2; margin-top: 18px; padding-top: 10px; font-size: 9.5px; color: #5a655c; font-family: Arial; line-height: 1.5; break-inside: avoid; page-break-inside: avoid; }
.foot-notes b { color: #2a3a30; }

/* ── Screen-only preview scaling (the editor scales the A4 doc to fit) ──── */
.preview-pane { overflow: auto; }
.preview-scale { transform: scale(0.62); transform-origin: top center; }
.doc { box-shadow: 0 10px 40px rgba(0, 0, 0, .35); border: 1px solid #e3e6e2; }

/* ── Print ─────────────────────────────────────────────────────────────── */
@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body * { visibility: hidden !important; }
  .print-root, .print-root * { visibility: visible !important; }
  .print-root { position: absolute; left: 0; top: 0; width: 100%; }
  /* Neutralize the screen preview transform/clipping so print is full-size A4.
     !important beats the inline/screen transform on the ancestor wrapper. */
  .preview-scale { transform: none !important; }
  .preview-pane { overflow: visible !important; max-height: none !important; padding: 0 !important; background: #fff !important; }
  .doc { box-shadow: none !important; border: none !important; width: 210mm; margin: 0; }
  .no-print { display: none !important; }
  table.items thead { display: table-header-group; } /* repeat header per page */
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/print.css
git commit -m "feat: add document print stylesheet"
```

### Task 4.2: `DocHeader.tsx`

**Files:**
- Create: `src/app/admin/documents/DocHeader.tsx`

- [ ] **Step 1: Write the component**

`src/app/admin/documents/DocHeader.tsx`:
```tsx
import agroLogo from '../../../imports/logo-with-shadow.png';
import westernLogo from '../../../imports/partners/western-logo.png';
import senningerLogo from '../../../imports/partners/senninger.png';
import type { CompanySettings } from './types';

export function DocHeader({ company }: { company: CompanySettings }) {
  return (
    <>
      <div className="doc-hd">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img className="logo-agro" src={agroLogo} alt="Agro Espace" />
            <div>
              <div className="brand-name">{company.brandName}</div>
              <div className="brand-sub sans">{company.tagline}</div>
            </div>
          </div>
          <div className="brand-lines sans">
            CAPITAL SOCIAL : {company.capital} &nbsp;·&nbsp; Siège : {company.siege}<br />
            Tél : {company.tel} &nbsp; FAX : {company.fax} &nbsp; Email : {company.email}<br />
            <span className="brand-ids">
              R.C. {company.rc} · ART.IMP {company.artImp} · NIF {company.nif} · NIS {company.nis}
            </span>
          </div>
        </div>
        <div style={{ minWidth: 120 }}>
          <img className="logo-western" src={westernLogo} alt="Western" />
          <img className="logo-senninger" src={senningerLogo} alt="Senninger" />
        </div>
      </div>
      <div className="rule" />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/DocHeader.tsx
git commit -m "feat: add document header component"
```

### Task 4.3: `ClientBox.tsx`

**Files:**
- Create: `src/app/admin/documents/ClientBox.tsx`

- [ ] **Step 1: Write the component**

`src/app/admin/documents/ClientBox.tsx`:
```tsx
import type { ClientInfo } from './types';

export function ClientBox({ client }: { client: ClientInfo }) {
  // Identity rows only render when filled, so the box stays compact.
  const idRows: Array<[string, string]> = [
    ['R.C', client.rc],
    ['NIF', client.nif],
    ['NIS', client.nis],
    ['ART', client.art],
    ['IA', client.ia],
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/ClientBox.tsx
git commit -m "feat: add client box component"
```

### Task 4.4: `ItemsTable.tsx`

**Files:**
- Create: `src/app/admin/documents/ItemsTable.tsx`

- [ ] **Step 1: Write the component**

`src/app/admin/documents/ItemsTable.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/ItemsTable.tsx
git commit -m "feat: add items table render component"
```

### Task 4.5: `TotalsBlock.tsx`

**Files:**
- Create: `src/app/admin/documents/TotalsBlock.tsx`

- [ ] **Step 1: Write the component**

`src/app/admin/documents/TotalsBlock.tsx`:
```tsx
import type { DocType, FactureExtras } from './types';
import { computeTotals, retenueGarantie, formatMoneyFr } from './lib/calc';
import { numberToFrenchWords } from './lib/numberToWords.fr';

const WORDS_OVERFLOW_LIMIT = 110; // chars; beyond this, switch suffix to "DA"

export function TotalsBlock({
  items,
  docType,
  proformaWord,
  factureExtras,
}: {
  items: Array<{ qty: number; puHT: number }>;
  docType: DocType;
  proformaWord: string; // "proforma" | "facture" for the "Arrêtée la présente ..." line
  factureExtras?: FactureExtras;
}) {
  const totals = computeTotals(items);
  const longWords = numberToFrenchWords(totals.totalTTC, { currency: 'long' });
  const amountInWords =
    longWords.length > WORDS_OVERFLOW_LIMIT
      ? numberToFrenchWords(totals.totalTTC, { currency: 'short' })
      : longWords;

  const pct = factureExtras?.retenueGarantiePct;
  const showRetenue = docType === 'facture' && typeof pct === 'number' && pct > 0;
  const rg = showRetenue ? retenueGarantie(totals.sousTotalHT, pct!) : null;

  return (
    <div className="totals-wrap">
      <div className="words">
        <div className="cap">Arrêtée la présente {proformaWord} à la somme de :</div>
        {amountInWords}
      </div>
      <div className="totals">
        <div className="tline"><span>Sous total HT</span><span className="num">{formatMoneyFr(totals.sousTotalHT)}</span></div>
        <div className="tline"><span>T.V.A (19 %)</span><span className="num">{formatMoneyFr(totals.tva)}</span></div>
        <div className="grand"><span>TOTAL TTC</span><span className="num">{formatMoneyFr(totals.totalTTC)}</span></div>
        {rg && (
          <div className="retenue">
            <div className="tline"><span>Retenue garantie ({pct}%)</span><span className="num">{formatMoneyFr(rg.retenue)}</span></div>
            <div className="tline"><span>Montant net à payer HT</span><span className="num">{formatMoneyFr(rg.netHT)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/TotalsBlock.tsx
git commit -m "feat: add totals block with amount-in-words and retenue garantie"
```

### Task 4.6: `DocFooter.tsx`

**Files:**
- Create: `src/app/admin/documents/DocFooter.tsx`

- [ ] **Step 1: Write the component**

`src/app/admin/documents/DocFooter.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/DocFooter.tsx
git commit -m "feat: add document footer component"
```

### Task 4.7: `DocumentPreview.tsx`

**Files:**
- Create: `src/app/admin/documents/DocumentPreview.tsx`

- [ ] **Step 1: Write the composing component**

`src/app/admin/documents/DocumentPreview.tsx`:
```tsx
import './print.css';
import type { DocumentDraft } from './types';
import { DocHeader } from './DocHeader';
import { ClientBox } from './ClientBox';
import { ItemsTable } from './ItemsTable';
import { TotalsBlock } from './TotalsBlock';
import { DocFooter } from './DocFooter';

function formatFrDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function DocumentPreview({
  draft,
  displayId,
  provisional,
}: {
  draft: DocumentDraft;
  displayId: string;
  provisional: boolean; // show "(provisoire)" next to id while not yet finalized
}) {
  const title = draft.type === 'proforma' ? 'Facture Proforma' : 'Facture';
  const proformaWord = draft.type === 'proforma' ? 'proforma' : 'facture';
  const fx = draft.factureExtras;

  return (
    <div className="print-root">
      <div className="doc">
        <DocHeader company={draft.companySnapshot} />

        <div className="id-row">
          <div>
            <div className="doc-title">
              {title} N° : {displayId}
              {provisional && <span className="provisional">(provisoire)</span>}
              <span className="accent" />
            </div>
            <div className="doc-date sans">
              {draft.wilayaCity} le : {formatFrDate(draft.date)}
            </div>
            {draft.type === 'facture' && fx && (fx.orderNo || fx.contractNo || fx.objet) && (
              <div className="facture-extras sans">
                {fx.orderNo && <div>N° d'ordre {fx.orderNo}</div>}
                {fx.contractNo && <div>Contrat N° {fx.contractNo}</div>}
                {fx.objet && <div>{fx.objet}</div>}
              </div>
            )}
          </div>
          <ClientBox client={draft.client} />
        </div>

        <div className="page-no sans">Page 1 / 1</div>

        <ItemsTable items={draft.items} />

        <TotalsBlock
          items={draft.items}
          docType={draft.type}
          proformaWord={proformaWord}
          factureExtras={fx}
        />

        <DocFooter
          validUntil={draft.validUntil}
          stampUrl={draft.stampUrl}
          footerHtml={draft.footerHtml}
        />
      </div>
    </div>
  );
}
```

> **Note on "Page 1 / 1":** the printed page count is driven by the browser's print
> engine via the CSS in Task 4.1 (`break-inside: avoid` + repeating `<thead>`). The
> on-screen label shows "Page 1 / 1" for the common single-page case; a multi-page
> counter is out of scope for v1 (the print dialog itself paginates correctly).

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/DocumentPreview.tsx
git commit -m "feat: add composed document preview"
```

### Task 4.8: `RichTextEditor.tsx`

**Files:**
- Create: `src/app/admin/documents/RichTextEditor.tsx`

- [ ] **Step 1: Write the component**

`src/app/admin/documents/RichTextEditor.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { Bold, List, Eraser } from 'lucide-react';
import { sanitizeRichHtml } from './lib/sanitizeHtml';

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value into the DOM only when it differs (avoids caret jumps).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const emit = () => {
    if (ref.current) onChange(sanitizeRichHtml(ref.current.innerHTML));
  };

  // Bold/list/clear: styleWithCSS=false emits tag-based markup (<b>, <ul><li>) the
  // sanitizer keeps. (styleWithCSS=true would emit styled spans that get stripped.)
  const applyCmd = (cmd: string) => {
    ref.current?.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(cmd, false);
    emit();
  };

  // Font size: wrap the selection in <span style="font-size:Npx"> manually —
  // execCommand 'fontSize' only produces <font size>, which the sanitizer drops.
  const applySize = (size: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return; // nothing selected → no-op
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return; // selection must be in this editor
    const span = document.createElement('span');
    span.style.fontSize = size;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      sel.removeAllRanges();
      const after = document.createRange();
      after.selectNodeContents(span);
      after.collapse(false);
      sel.addRange(after);
    } catch {
      document.execCommand('insertHTML', false, `<span style="font-size:${size}">${sel.toString()}</span>`);
    }
    emit();
  };

  const btn = 'px-2 py-1 rounded text-white/80 hover:bg-white/10 text-sm';

  return (
    <div className="rounded-lg border border-white/10 bg-[#0f2618]">
      <div className="flex items-center gap-1 border-b border-white/10 px-1 py-1 no-print">
        <button type="button" className={btn} title="Gras" onClick={() => applyCmd('bold')}>
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" className={btn} title="Petit" onClick={() => applySize('11px')}>A−</button>
        <button type="button" className={btn} title="Normal" onClick={() => applySize('14px')}>A</button>
        <button type="button" className={btn} title="Grand" onClick={() => applySize('18px')}>A+</button>
        <button type="button" className={btn} title="Liste" onClick={() => applyCmd('insertUnorderedList')}>
          <List className="w-4 h-4" />
        </button>
        <button type="button" className={btn} title="Effacer le format" onClick={() => applyCmd('removeFormat')}>
          <Eraser className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder ?? ''}
        className="min-h-[120px] px-3 py-2 text-sm text-white/90 outline-none [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-white/30"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/RichTextEditor.tsx
git commit -m "feat: add rich-text editor component"
```

---

## Phase 5 — Form editor, presets, settings

### Task 5.1: `ItemRowsEditor.tsx`

**Files:**
- Create: `src/app/admin/documents/ItemRowsEditor.tsx`

- [ ] **Step 1: Write the component**

`src/app/admin/documents/ItemRowsEditor.tsx`:
```tsx
import { Plus, Trash2 } from 'lucide-react';
import type { ItemRow, ProductPreset } from './types';
import { RichTextEditor } from './RichTextEditor';
import { lineMontantHT, formatMoneyFr } from './lib/calc';

const emptyRow = (): ItemRow => ({ ref: '', designationHtml: '', um: 'U', qty: 1, puHT: 0 });

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
      { ref: p.ref, designationHtml: p.designationHtml, um: p.um || 'U', qty: 1, puHT: p.defaultPU || 0 },
    ]);
  };

  return (
    <div className="space-y-4">
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
          <div className="grid grid-cols-4 gap-2">
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/ItemRowsEditor.tsx
git commit -m "feat: add editable item rows component"
```

### Task 5.2: `PresetManager.tsx`

**Files:**
- Create: `src/app/admin/documents/PresetManager.tsx`

- [ ] **Step 1: Write the component**

A modal with tabs for the four preset kinds. Stamp presets upload an image to imgBB
(same flow as `Featured.tsx`). Product presets use the `RichTextEditor`.

`src/app/admin/documents/PresetManager.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Save, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { DocApi } from './lib/docApi';
import type {
  PresetKind, BankPreset, FooterPreset, ProductPreset, StampPreset,
} from './types';
import { RichTextEditor } from './RichTextEditor';
import { sanitizeRichHtml } from './lib/sanitizeHtml';

const IMGBB_KEY = (import.meta as any).env?.VITE_IMGBB_KEY ?? '';

async function uploadToImgBB(file: File): Promise<string> {
  if (!IMGBB_KEY) throw new Error("Clé d'upload image non configurée");
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: form });
  const json = await res.json();
  if (!json?.success) throw new Error('Échec du téléversement');
  return (json.data?.display_url ?? json.data?.url) as string;
}

const TABS: { kind: PresetKind; label: string }[] = [
  { kind: 'bank', label: 'Banques' },
  { kind: 'footer', label: 'Pieds de page' },
  { kind: 'product', label: 'Produits' },
  { kind: 'stamp', label: 'Cachets' },
];

const field = 'w-full rounded-lg bg-[#0f2618] border border-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#87A922]';
const label = 'block text-[11px] uppercase tracking-wide text-white/40 mb-1';

export function PresetManager({ docApi, onClose }: { docApi: DocApi; onClose: () => void }) {
  const [tab, setTab] = useState<PresetKind>('bank');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async (kind: PresetKind) => {
    setLoading(true);
    try { setRows(await docApi.listPresets<any>(kind)); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(tab); /* eslint-disable-line */ }, [tab]);

  const blank = (kind: PresetKind): any => ({
    bank: { label: '', bankName: '', accountLine: '' },
    footer: { label: '', html: '' },
    product: { label: '', ref: '', designationHtml: '', um: 'U', defaultPU: 0 },
    stamp: { label: '', imageUrl: '' },
  }[kind]);

  const addBlank = () => setRows([...rows, { ...blank(tab), _new: true }]);
  const patch = (i: number, p: any) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  const save = async (i: number) => {
    const r = rows[i];
    setBusy(true);
    try {
      const body = { ...r };
      delete body._new;
      if (tab === 'product') body.designationHtml = sanitizeRichHtml(body.designationHtml || '');
      if (tab === 'footer') body.html = sanitizeRichHtml(body.html || '');
      if (r._new) await docApi.createPreset(tab, body);
      else await docApi.updatePreset(tab, r.id, body);
      toast.success('Préréglage enregistré');
      await load(tab);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const del = async (i: number) => {
    const r = rows[i];
    if (r._new) { setRows(rows.filter((_, idx) => idx !== i)); return; }
    if (!confirm('Supprimer ce préréglage ?')) return;
    try { await docApi.deletePreset(tab, r.id); await load(tab); }
    catch (e) { toast.error((e as Error).message); }
  };

  const onUpload = async (i: number, file: File) => {
    setBusy(true);
    try { patch(i, { imageUrl: await uploadToImgBB(file) }); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-2xl bg-[#0a1c12] border border-white/10 flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-white font-semibold">Préréglages</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1 border-b border-white/10 px-3">
          {TABS.map((t) => (
            <button key={t.kind} onClick={() => setTab(t.kind)}
              className={`px-3 py-2 text-sm ${tab === t.kind ? 'text-white border-b-2 border-[#87A922]' : 'text-white/50 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#87A922]" /></div>
          ) : (
            rows.map((r, i) => (
              <div key={r.id ?? `new-${i}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                <div>
                  <label className={label}>Libellé</label>
                  <input className={field} value={r.label} onChange={(e) => patch(i, { label: e.target.value })} />
                </div>

                {tab === 'bank' && (<>
                  <div><label className={label}>Nom de la banque</label>
                    <input className={field} value={r.bankName} onChange={(e) => patch(i, { bankName: e.target.value })} /></div>
                  <div><label className={label}>N° de compte</label>
                    <input className={field} value={r.accountLine} onChange={(e) => patch(i, { accountLine: e.target.value })} /></div>
                </>)}

                {tab === 'footer' && (
                  <div><label className={label}>Texte du pied de page</label>
                    <RichTextEditor value={r.html} onChange={(html) => patch(i, { html })} /></div>
                )}

                {tab === 'product' && (<>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className={label}>Référence</label>
                      <input className={field} value={r.ref} onChange={(e) => patch(i, { ref: e.target.value })} /></div>
                    <div><label className={label}>UM</label>
                      <input className={field} value={r.um} onChange={(e) => patch(i, { um: e.target.value })} /></div>
                    <div><label className={label}>P.U H.T par défaut</label>
                      <input type="number" step="0.01" className={field} value={r.defaultPU}
                        onChange={(e) => patch(i, { defaultPU: Number(e.target.value) })} /></div>
                  </div>
                  <div><label className={label}>Désignation</label>
                    <RichTextEditor value={r.designationHtml} onChange={(html) => patch(i, { designationHtml: html })} /></div>
                </>)}

                {tab === 'stamp' && (
                  <div className="flex items-center gap-3">
                    {r.imageUrl && <img src={r.imageUrl} alt="" className="w-20 h-20 object-contain bg-white rounded" />}
                    <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 cursor-pointer hover:bg-white/5">
                      <Upload className="w-4 h-4" /> Téléverser
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(i, f); }} />
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => del(i)} className="inline-flex items-center gap-1 text-sm text-red-300/70 hover:text-red-300">
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                  <button onClick={() => save(i)} disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#87A922] px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
                    <Save className="w-4 h-4" /> Enregistrer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          <button onClick={addBlank}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5">
            <Plus className="w-4 h-4" /> Ajouter un préréglage
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/documents/PresetManager.tsx
git commit -m "feat: add preset manager modal"
```

### Task 5.3: `CompanySettingsModal.tsx`

**Files:**
- Create: `src/app/admin/documents/CompanySettingsModal.tsx`

- [ ] **Step 1: Write the component**

`src/app/admin/documents/CompanySettingsModal.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DocApi } from './lib/docApi';
import type { CompanySettings } from './types';
import { DEFAULT_COMPANY } from './defaults';

const field = 'w-full rounded-lg bg-[#0f2618] border border-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#87A922]';
const label = 'block text-[11px] uppercase tracking-wide text-white/40 mb-1';

export function CompanySettingsModal({
  docApi,
  onClose,
  onSaved,
}: {
  docApi: DocApi;
  onClose: () => void;
  onSaved: (c: CompanySettings) => void;
}) {
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [proformaNext, setProformaNext] = useState(1);
  const [factureNext, setFactureNext] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, counters] = await Promise.all([docApi.getCompany(), docApi.getCounters()]);
        if (c && Object.keys(c).length) setCompany({ ...DEFAULT_COMPANY, ...(c as CompanySettings) });
        setProformaNext(counters.proforma_next);
        setFactureNext(counters.facture_next);
      } catch (e) { toast.error((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, [docApi]);

  const set = (k: keyof CompanySettings, v: string) => setCompany({ ...company, [k]: v });

  const save = async () => {
    setBusy(true);
    try {
      const saved = await docApi.saveCompany(company);
      // Counters store the LAST used number; "next" - 1.
      await docApi.setCounter('proforma', Math.max(0, proformaNext - 1));
      await docApi.setCounter('facture', Math.max(0, factureNext - 1));
      toast.success('Paramètres enregistrés');
      onSaved(saved as CompanySettings);
      onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const fields: Array<[keyof CompanySettings, string]> = [
    ['brandName', 'Nom'], ['tagline', 'Slogan'], ['capital', 'Capital social'],
    ['siege', 'Siège'], ['tel', 'Tél'], ['fax', 'Fax'], ['email', 'Email'],
    ['rc', 'R.C'], ['artImp', 'ART.IMP'], ['nif', 'NIF'], ['nis', 'NIS'],
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl bg-[#0a1c12] border border-white/10 flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-white font-semibold">Paramètres de l'entreprise</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#87A922]" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {fields.map(([k, l]) => (
                <div key={k}>
                  <label className={label}>{l}</label>
                  <input className={field} value={company[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3">
              <div className="text-amber-200/80 text-xs uppercase tracking-wide mb-2">
                Numérotation — prochain numéro
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Proforma (P••••/AA)</label>
                  <input type="number" min={1} className={field} value={proformaNext}
                    onChange={(e) => setProformaNext(Number(e.target.value))} />
                </div>
                <div>
                  <label className={label}>Facture (•••••/AA)</label>
                  <input type="number" min={1} className={field} value={factureNext}
                    onChange={(e) => setFactureNext(Number(e.target.value))} />
                </div>
              </div>
              <p className="text-white/40 text-[11px] mt-2">
                Définissez le prochain numéro pour synchroniser la suite avec Logicom.
              </p>
            </div>
          </div>
        )}
        <div className="border-t border-white/10 p-4 flex justify-end">
          <button onClick={save} disabled={busy || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#87A922] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
            <Save className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `defaults.ts` (used by the modal and editor)**

`src/app/admin/documents/defaults.ts`:
```ts
import type { CompanySettings, ClientInfo, DocumentDraft } from './types';

export const DEFAULT_COMPANY: CompanySettings = {
  brandName: 'AGRO ESPACE',
  tagline: "Vente de produits et matériels pour l'agriculture",
  capital: '10 000 000.00 Da',
  siege: 'HOFRAT ELABAS MENIAA W. MENIAA',
  tel: '029215966',
  fax: '029215966',
  email: 'contact@agroespace.com',
  rc: '47/06-0863493 B15',
  artImp: '58010001874',
  nif: '00154708634935347006',
  nis: '001547020001564',
};

export const EMPTY_CLIENT: ClientInfo = {
  name: '', adresse: '', wilaya: '', rc: '', nif: '', nis: '', art: '', ia: '',
};

/** ISO date N days from `from`. */
export function addDaysIso(from: Date, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function emptyDraft(company: CompanySettings): DocumentDraft {
  const now = new Date();
  return {
    type: 'proforma',
    wilayaCity: 'MENIAA',
    date: now.toISOString(),
    validUntil: addDaysIso(now, 15),
    client: { ...EMPTY_CLIENT },
    items: [{ ref: '', designationHtml: '', um: 'U', qty: 1, puHT: 0 }],
    factureExtras: {},
    bank: { bankName: '', accountLine: '' },
    footerHtml: '',
    stampUrl: '',
    companySnapshot: company,
    totals: { sousTotalHT: 0, tva: 0, totalTTC: 0 },
    amountInWords: '',
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/documents/CompanySettingsModal.tsx src/app/admin/documents/defaults.ts
git commit -m "feat: add company settings modal and document defaults"
```

### Task 5.4: `DocumentEditor.tsx`

**Files:**
- Create: `src/app/admin/documents/DocumentEditor.tsx`

- [ ] **Step 1: Write the editor orchestrator**

`src/app/admin/documents/DocumentEditor.tsx`:
```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Printer, Save, Settings as SettingsIcon, Layers, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DocApi } from './lib/docApi';
import type {
  DocumentDraft, DocumentRecord, DocType,
  BankPreset, FooterPreset, ProductPreset, StampPreset, CompanySettings,
} from './types';
import { DEFAULT_COMPANY, emptyDraft, addDaysIso } from './defaults';
import { computeTotals } from './lib/calc';
import { numberToFrenchWords } from './lib/numberToWords.fr';
import { sanitizeRichHtml } from './lib/sanitizeHtml';
import { DocumentPreview } from './DocumentPreview';
import { ItemRowsEditor } from './ItemRowsEditor';
import { RichTextEditor } from './RichTextEditor';
import { PresetManager } from './PresetManager';
import { CompanySettingsModal } from './CompanySettingsModal';

const field = 'w-full rounded-lg bg-[#0f2618] border border-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#87A922]';
const label = 'block text-[11px] uppercase tracking-wide text-white/40 mb-1';
const section = 'rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3';
const h = 'text-white font-semibold text-sm';

function buildDisplayId(type: DocType, num: number, isoDate: string): string {
  const yy = String(new Date(isoDate).getFullYear() % 100).padStart(2, '0');
  return type === 'proforma'
    ? `P${String(num).padStart(4, '0')}/${yy}`
    : `${String(num).padStart(5, '0')}/${yy}`;
}

export function DocumentEditor({
  docApi,
  existing,
  seedDraft,
  onBack,
  onSaved,
}: {
  docApi: DocApi;
  existing: DocumentRecord | null;
  seedDraft?: DocumentDraft | null; // for "duplicate": pre-fill a NEW draft
  onBack: () => void;
  onSaved: () => void;
}) {
  const [company, setCompany] = useState<CompanySettings>(DEFAULT_COMPANY);
  const [draft, setDraft] = useState<DocumentDraft>(() => emptyDraft(DEFAULT_COMPANY));
  const [counters, setCounters] = useState({ proforma_next: 1, facture_next: 1 });
  const [presets, setPresets] = useState<{
    bank: BankPreset[]; footer: FooterPreset[]; product: ProductPreset[]; stamp: StampPreset[];
  }>({ bank: [], footer: [], product: [], stamp: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const manualValidity = useRef(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, ct, bank, footer, product, stamp] = await Promise.all([
        docApi.getCompany(),
        docApi.getCounters(),
        docApi.listPresets<BankPreset>('bank'),
        docApi.listPresets<FooterPreset>('footer'),
        docApi.listPresets<ProductPreset>('product'),
        docApi.listPresets<StampPreset>('stamp'),
      ]);
      const comp = (c && Object.keys(c).length ? { ...DEFAULT_COMPANY, ...(c as CompanySettings) } : DEFAULT_COMPANY);
      setCompany(comp);
      setCounters(ct);
      setPresets({ bank, footer, product, stamp });
      if (existing) {
        manualValidity.current = true;
        setDraft({ ...existing });
      } else if (seedDraft) {
        manualValidity.current = true;
        setDraft({ ...seedDraft, companySnapshot: comp });
      } else {
        setDraft(emptyDraft(comp));
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); /* eslint-disable-line */ }, [existing, seedDraft]);

  const set = <K extends keyof DocumentDraft>(k: K, v: DocumentDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const setClient = (k: keyof DocumentDraft['client'], v: string) =>
    setDraft((d) => ({ ...d, client: { ...d.client, [k]: v } }));
  const setExtras = (k: string, v: any) =>
    setDraft((d) => ({ ...d, factureExtras: { ...(d.factureExtras ?? {}), [k]: v } }));

  const onDateChange = (iso: string) => {
    setDraft((d) => ({
      ...d,
      date: iso,
      validUntil: manualValidity.current ? d.validUntil : addDaysIso(new Date(iso), 15),
    }));
  };

  // Provisional display id (for new docs) or the real one (when editing).
  const displayId = existing
    ? existing.displayId
    : buildDisplayId(
        draft.type,
        draft.type === 'proforma' ? counters.proforma_next : counters.facture_next,
        draft.date,
      );

  const finalize = async () => {
    setSaving(true);
    try {
      const totals = computeTotals(draft.items);
      const amountInWords = numberToFrenchWords(totals.totalTTC);
      const payload: DocumentDraft = {
        ...draft,
        companySnapshot: company,
        items: draft.items.map((it) => ({ ...it, designationHtml: sanitizeRichHtml(it.designationHtml) })),
        footerHtml: sanitizeRichHtml(draft.footerHtml),
        totals,
        amountInWords,
      };
      if (existing) await docApi.updateDocument(existing.id, payload as Partial<DocumentRecord>);
      else await docApi.createDocument(payload);
      toast.success(existing ? 'Document mis à jour' : 'Document créé');
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const toInputDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-[#87A922]" /></div>;
  }

  return (
    <div className="min-h-screen">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0a1c12]/90 backdrop-blur px-5 py-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5">
            <SettingsIcon className="w-4 h-4" /> Paramètres
          </button>
          <button onClick={() => setShowPresets(true)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5">
            <Layers className="w-4 h-4" /> Préréglages
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5">
            <Printer className="w-4 h-4" /> Imprimer / PDF
          </button>
          <button onClick={finalize} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#87A922] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {existing ? 'Mettre à jour' : 'Finaliser & créer'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-5">
        {/* ── Form ── */}
        <div className="no-print space-y-4">
          {/* Type */}
          <div className={section}>
            <div className="flex gap-2">
              {(['proforma', 'facture'] as DocType[]).map((t) => (
                <button key={t} onClick={() => set('type', t)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${draft.type === t ? 'bg-[#87A922] text-white' : 'border border-white/10 text-white/60 hover:bg-white/5'}`}>
                  {t === 'proforma' ? 'Facture Proforma' : 'Facture'}
                </button>
              ))}
            </div>
            <div className="text-white/40 text-xs">N° {displayId}{!existing && ' (provisoire)'}</div>
          </div>

          {/* Document */}
          <div className={section}>
            <div className={h}>Document</div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className={label}>Ville (Wilaya)</label>
                <input className={field} value={draft.wilayaCity} onChange={(e) => set('wilayaCity', e.target.value)} /></div>
              <div><label className={label}>Date</label>
                <input type="date" className={field} value={toInputDate(draft.date)}
                  onChange={(e) => onDateChange(new Date(e.target.value).toISOString())} /></div>
              <div><label className={label}>Valable jusqu'au</label>
                <input type="date" className={field} value={toInputDate(draft.validUntil)}
                  onChange={(e) => { manualValidity.current = true; set('validUntil', new Date(e.target.value).toISOString()); }} /></div>
            </div>
          </div>

          {/* Client */}
          <div className={section}>
            <div className={h}>Client</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['name', 'Nom'], ['adresse', 'Adresse'], ['wilaya', 'Wilaya'], ['rc', 'R.C'],
                ['nif', 'NIF'], ['nis', 'NIS'], ['art', 'ART'], ['ia', 'IA'],
              ] as Array<[keyof DocumentDraft['client'], string]>).map(([k, l]) => (
                <div key={k}><label className={label}>{l}</label>
                  <input className={field} value={draft.client[k]} onChange={(e) => setClient(k, e.target.value)} /></div>
              ))}
            </div>
          </div>

          {/* Facture extras */}
          {draft.type === 'facture' && (
            <div className={section}>
              <div className={h}>Mentions facture (bas de page)</div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={label}>N° d'ordre</label>
                  <input className={field} value={draft.factureExtras?.orderNo ?? ''} onChange={(e) => setExtras('orderNo', e.target.value)} /></div>
                <div><label className={label}>Contrat N°</label>
                  <input className={field} value={draft.factureExtras?.contractNo ?? ''} onChange={(e) => setExtras('contractNo', e.target.value)} /></div>
                <div><label className={label}>Retenue garantie (%)</label>
                  <input type="number" min={0} className={field} value={draft.factureExtras?.retenueGarantiePct ?? ''}
                    onChange={(e) => setExtras('retenueGarantiePct', e.target.value === '' ? undefined : Number(e.target.value))} /></div>
              </div>
              <div><label className={label}>Objet</label>
                <textarea className={field} rows={2} value={draft.factureExtras?.objet ?? ''} onChange={(e) => setExtras('objet', e.target.value)} /></div>
            </div>
          )}

          {/* Bank */}
          <div className={section}>
            <div className={h}>Banque</div>
            <select className={field} defaultValue=""
              onChange={(e) => { const p = presets.bank.find((b) => b.id === Number(e.target.value)); if (p) set('bank', { bankName: p.bankName, accountLine: p.accountLine }); }}>
              <option value="">Choisir un préréglage…</option>
              {presets.bank.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={label}>Nom de la banque</label>
                <input className={field} value={draft.bank.bankName} onChange={(e) => set('bank', { ...draft.bank, bankName: e.target.value })} /></div>
              <div><label className={label}>N° de compte</label>
                <input className={field} value={draft.bank.accountLine} onChange={(e) => set('bank', { ...draft.bank, accountLine: e.target.value })} /></div>
            </div>
          </div>

          {/* Items */}
          <div className={section}>
            <div className={h}>Articles</div>
            <ItemRowsEditor items={draft.items} onChange={(items) => set('items', items)} productPresets={presets.product} />
          </div>

          {/* Footer + stamp */}
          <div className={section}>
            <div className={h}>Pied de page & cachet</div>
            <select className={field} defaultValue=""
              onChange={(e) => { const p = presets.footer.find((f) => f.id === Number(e.target.value)); if (p) set('footerHtml', p.html); }}>
              <option value="">Choisir un pied de page…</option>
              {presets.footer.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <RichTextEditor value={draft.footerHtml} onChange={(html) => set('footerHtml', html)} placeholder="Notes de bas de page…" />
            <select className={field} defaultValue=""
              onChange={(e) => { const p = presets.stamp.find((s) => s.id === Number(e.target.value)); if (p) set('stampUrl', p.imageUrl); }}>
              <option value="">Choisir un cachet…</option>
              {presets.stamp.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="xl:sticky xl:top-20 self-start">
          <div className="preview-pane rounded-xl bg-white/5 p-3" style={{ maxHeight: 'calc(100vh - 7rem)' }}>
            <div className="preview-scale">
              <DocumentPreview draft={{ ...draft, companySnapshot: company }} displayId={displayId} provisional={!existing} />
            </div>
          </div>
        </div>
      </div>

      {showPresets && <PresetManager docApi={docApi} onClose={() => { setShowPresets(false); loadAll(); }} />}
      {showSettings && (
        <CompanySettingsModal docApi={docApi} onClose={() => setShowSettings(false)}
          onSaved={(c) => { setCompany(c); loadAll(); }} />
      )}
    </div>
  );
}
```

> **Print note:** the scaled-down preview (`scale(0.62)`) is for screen only. The
> `@media print` rules in `print.css` make `.print-root` visible at full A4 size and hide
> everything else, so `window.print()` outputs the document at 100%, not the scaled copy.
> The `transform` does not affect print because the scaled wrapper's ancestor chrome is
> hidden and `.doc` width is fixed in mm.

- [ ] **Step 2: Verify the screen scale does not leak into print**

This is verified manually in Task 7.2 (print preview). No code change here.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/documents/DocumentEditor.tsx
git commit -m "feat: add document editor with live preview"
```

---

## Phase 6 — List page, routing, navigation

### Task 6.1: `Documents.tsx` (list + orchestration)

**Files:**
- Create: `src/app/admin/pages/Documents.tsx`

- [ ] **Step 1: Write the route component**

`src/app/admin/pages/Documents.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, FileText, Copy, Printer, Ban, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '../auth/AuthProvider';
import { AdminHeader } from './AdminHeader';
import { createDocApi } from '../documents/lib/docApi';
import type { DocumentRecord, DocumentDraft, PaginatedDocuments } from '../documents/types';
import { formatMoneyFr } from '../documents/lib/calc';
import { DocumentEditor } from '../documents/DocumentEditor';

type View =
  | { mode: 'list' }
  | { mode: 'edit'; doc: DocumentRecord }
  | { mode: 'new'; seed: DocumentDraft | null };

const formatFrDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export const Documents = () => {
  const { api } = useAdminAuth();
  const docApi = useMemo(() => createDocApi(api), [api]);

  const [view, setView] = useState<View>({ mode: 'list' });
  const [data, setData] = useState<PaginatedDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<'all' | 'proforma' | 'facture'>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setData(await docApi.listDocuments({ page, per_page: 25, type, search }));
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (view.mode === 'list') load(); /* eslint-disable-line */ }, [view, page, type, search]);

  const openEdit = async (id: number) => {
    try { setView({ mode: 'edit', doc: await docApi.getDocument(id) }); }
    catch (e) { toast.error((e as Error).message); }
  };
  const duplicate = async (id: number) => {
    try {
      const d = await docApi.getDocument(id);
      const { id: _i, number: _n, year: _y, displayId: _d, status: _s, created_at: _c, updated_at: _u, ...rest } = d;
      setView({ mode: 'new', seed: { ...rest, date: new Date().toISOString() } as DocumentDraft });
    } catch (e) { toast.error((e as Error).message); }
  };
  const cancel = async (id: number) => {
    if (!confirm('Annuler ce document ? Son numéro restera réservé.')) return;
    try { await docApi.cancelDocument(id); toast.success('Document annulé'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const remove = async (id: number) => {
    if (!confirm('Supprimer définitivement ce document ?')) return;
    try { await docApi.deleteDocument(id); toast.success('Supprimé'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  if (view.mode !== 'list') {
    return (
      <DocumentEditor
        docApi={docApi}
        existing={view.mode === 'edit' ? view.doc : null}
        seedDraft={view.mode === 'new' ? view.seed : null}
        onBack={() => setView({ mode: 'list' })}
        onSaved={() => setView({ mode: 'list' })}
      />
    );
  }

  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm ${active ? 'bg-[#87A922] text-white' : 'text-white/60 hover:bg-white/5'}`;

  return (
    <div>
      <AdminHeader title="Factures & Proformas" subtitle="Créer et gérer les documents commerciaux" />
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button className={pill(type === 'all')} onClick={() => { setType('all'); setPage(1); }}>Tous {data ? `(${data.counts.all})` : ''}</button>
            <button className={pill(type === 'proforma')} onClick={() => { setType('proforma'); setPage(1); }}>Proformas {data ? `(${data.counts.proforma})` : ''}</button>
            <button className={pill(type === 'facture')} onClick={() => { setType('facture'); setPage(1); }}>Factures {data ? `(${data.counts.facture})` : ''}</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Rechercher…"
                className="rounded-lg bg-[#0f2618] border border-white/10 pl-9 pr-3 py-2 text-sm text-white/90 outline-none focus:border-[#87A922]" />
            </div>
            <button onClick={() => setView({ mode: 'new', seed: null })}
              className="inline-flex items-center gap-2 rounded-lg bg-[#87A922] px-4 py-2 text-sm font-medium text-white hover:brightness-110">
              <Plus className="w-4 h-4" /> Nouveau
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-white/50 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">N°</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Total TTC</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#87A922] mx-auto" /></td></tr>
              ) : !data || data.items.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-white/40">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" /> Aucun document
                </td></tr>
              ) : (
                data.items.map((d) => (
                  <tr key={d.id} className={`text-white/80 hover:bg-white/[0.02] ${d.status === 'cancelled' ? 'opacity-50 line-through' : ''}`}>
                    <td className="px-4 py-3 font-medium text-white cursor-pointer" onClick={() => openEdit(d.id)}>{d.displayId}</td>
                    <td className="px-4 py-3">{d.type === 'proforma' ? 'Proforma' : 'Facture'}</td>
                    <td className="px-4 py-3">{d.client?.name || '—'}</td>
                    <td className="px-4 py-3">{formatFrDate(d.date)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoneyFr(d.totals?.totalTTC ?? 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button title="Ouvrir" onClick={() => openEdit(d.id)} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"><FileText className="w-4 h-4" /></button>
                        <button title="Dupliquer" onClick={() => duplicate(d.id)} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"><Copy className="w-4 h-4" /></button>
                        {d.status !== 'cancelled' && (
                          <button title="Annuler" onClick={() => cancel(d.id)} className="p-1.5 rounded hover:bg-white/10 text-amber-300/70 hover:text-amber-300"><Ban className="w-4 h-4" /></button>
                        )}
                        <button title="Supprimer" onClick={() => remove(d.id)} className="p-1.5 rounded hover:bg-white/10 text-red-300/70 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/70 disabled:opacity-40">Précédent</button>
            <span className="text-white/50 text-sm">Page {data.page} / {data.total_pages}</span>
            <button disabled={page >= data.total_pages} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/70 disabled:opacity-40">Suivant</button>
          </div>
        )}
      </div>
    </div>
  );
};
```

> **`AdminHeader` props:** confirm the prop names by reading
> `src/app/admin/pages/AdminHeader.tsx` before this step. If it does not accept
> `title`/`subtitle`, match its actual API (e.g. children or a single `title`).

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/pages/Documents.tsx
git commit -m "feat: add documents list page and editor orchestration"
```

### Task 6.2: Register the route

**Files:**
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Add the import**

After `import { Promo } from "./admin/pages/Promo";` add:
```tsx
import { Documents } from "./admin/pages/Documents";
```

- [ ] **Step 2: Add the route**

In the `/admin` children array, after `{ path: "quotes", Component: Quotes },` add:
```tsx
      { path: "documents", Component: Documents },
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds (no TS/import errors). Fix any type errors surfaced here before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes.tsx
git commit -m "feat: register /admin/documents route"
```

### Task 6.3: Add the sidebar nav item

**Files:**
- Modify: `src/app/layouts/AdminLayout.tsx`

- [ ] **Step 1: Import an icon**

In the `lucide-react` import block (around line 4-17), add `ReceiptText` to the imported names:
```tsx
  ReceiptText,
```

- [ ] **Step 2: Add the nav entry**

In `navItems`, after the `Devis en attente` entry, add:
```tsx
  { name: 'Factures & Proformas', path: '/admin/documents', icon: ReceiptText },
```

- [ ] **Step 3: Verify in the running app**

Run: `npm run dev`
Open `/admin/documents`. Expected: sidebar shows "Factures & Proformas"; clicking it loads the list page.

- [ ] **Step 4: Commit**

```bash
git add src/app/layouts/AdminLayout.tsx
git commit -m "feat: add Factures & Proformas sidebar link"
```

---

## Phase 7 — Verification & deploy

### Task 7.1: Run the full unit test suite

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: PASS — all `calc`, `numberToWords.fr`, and `sanitizeHtml` tests green.

- [ ] **Step 2: Type-check / build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

### Task 7.2: Manual print/preview verification

- [ ] **Step 1: Reproduce the example proforma**

With `npm run dev` running, open `/admin/documents` → Nouveau. Enter the KARZAZI example
(client KARZAZI AHMED, ADRAR, 1 pivot line: qty 2, P.U 8 100 000). Verify:
- Sous total HT = `16 200 000.00`, T.V.A = `3 078 000.00`, TOTAL TTC = `19 278 000.00`.
- Amount in words reads "Dix-neuf millions deux cent soixante-dix-huit mille dinars algériens".
- Provisional id shows `P0134/26`-style with "(provisoire)".

- [ ] **Step 2: Print preview**

Press the Print button → browser print dialog → "Save as PDF". Verify:
- The document is full A4 size (NOT the scaled-down screen preview).
- App chrome (sidebar, toolbar, form) is hidden.
- The footer/totals stay on the page and don't orphan onto a blank second page.

- [ ] **Step 3: Facture extras + retenue garantie**

Switch type to Facture, set Retenue garantie = 10, confirm the totals box shows
"Retenue garantie (10%)" and "Montant net à payer HT", matching the TAFADIS example math
(372 745 500 → retenue 37 274 550, net 335 470 950).

### Task 7.3: Deploy the edge function

- [ ] **Step 1: Deploy**

Run: `npx supabase functions deploy make-server-0c561120`
Expected: deploy succeeds. (If the project uses a different deploy step, follow the repo's
existing process — see `CONVERSATION.md`.)

- [ ] **Step 2: Smoke-test the endpoints**

In the running admin app, open the Settings modal and confirm counters load; create a
document and confirm it appears in the list with an allocated number; reopen it and confirm
the number is unchanged.

- [ ] **Step 3: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "chore: finalize proforma & facture creator"
```

---

## Self-Review Notes

- **Spec coverage:** document types + ID format (Tasks 2.1, 5.4), increment-on-finalize +
  manual seeding (2.2, 5.3), header/logos/bank/identifiers (4.2, 5.4), client box with
  RC/NIF/NIS/ART/IA (4.3, 5.4), product table + calc + 19% TVA (1.1, 4.4, 4.5), totals +
  French number-to-words + DA fallback (1.2, 4.5), validity date +15j default (defaults.ts,
  5.4), stamp upload presets (5.2), footer presets (5.2, 5.4), facture extras / N° d'ordre
  (5.4, 4.7), print + pagination/footer-no-orphan (4.1, 7.2), archive/list (6.1),
  rich-text presets (4.8, 5.2). All spec sections map to at least one task.
- **`defaults.ts`** is created in Task 5.3 Step 2 and consumed by Tasks 5.3 and 5.4 — it is
  in the dependency order before its consumers.
- **Type consistency:** `DocApi` (docApi.ts) method names match all call sites;
  `DocumentDraft`/`DocumentRecord`/`ItemRow`/`CompanySettings` are used consistently across
  components.
- **Two pre-implementation reads to confirm:** `AdminHeader` prop API (Task 6.1) and the
  exact `lucide-react` import block formatting (Task 6.3).

