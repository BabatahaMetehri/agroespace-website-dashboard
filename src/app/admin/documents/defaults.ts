import type {
  CompanySettings, ClientInfo, DocumentDraft, BankInfo,
  BankPreset, FooterPreset, StampPreset, IdentityPreset,
  ProductPreset, ProductComponent,
} from './types';

/**
 * Return a product preset's component lines. New presets carry a `components`
 * array; older single-line presets are adapted on the fly so both keep working.
 */
export function productComponents(p: ProductPreset): ProductComponent[] {
  if (Array.isArray(p.components) && p.components.length) return p.components;
  if (p.designationHtml || p.ref) {
    return [{
      ref: p.ref ?? '',
      designationHtml: p.designationHtml ?? '',
      um: p.um ?? 'U',
      qty: 1,
      puHT: p.defaultPU ?? 0,
    }];
  }
  return [];
}

/**
 * Normalize a document's bank data to an array. Old records stored a single
 * `bank` object; new ones store a `banks` array. Always returns at least one
 * (possibly empty) row so the editor has something to render.
 */
export function normalizeBanks(d: { banks?: BankInfo[]; bank?: BankInfo }): BankInfo[] {
  if (Array.isArray(d.banks) && d.banks.length) return d.banks;
  if (d.bank && (d.bank.bankName || d.bank.accountLine)) return [d.bank];
  return [{ bankName: '', accountLine: '' }];
}

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
  name: '', adresse: '', wilaya: '', rc: '', nif: '', nis: '', art: '', cf: '',
};

/** ISO date N days from `from`. */
export function addDaysIso(from: Date, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Identity fields a default identity preset overrides on the company header. */
export type IdentityDefaults = Pick<CompanySettings, 'rc' | 'artImp' | 'nif' | 'nis'>;

export interface PresetDefaults {
  /** All bank presets flagged default, mapped to bank lines (undefined → none). */
  banks?: BankInfo[];
  footerHtml?: string;
  stampUrl?: string;
  identity?: IdentityDefaults;
}

/**
 * Pick the values to prefill a brand-new document from any presets the user
 * flagged as default. Banks accumulate (all defaults are added); footer, stamp
 * and identity are single — the first flagged one wins. Returns only the fields
 * that have a default so callers can fall back to the empty draft otherwise.
 */
export function pickPresetDefaults(presets: {
  bank: BankPreset[]; footer: FooterPreset[]; stamp: StampPreset[]; identity: IdentityPreset[];
}): PresetDefaults {
  const banks = presets.bank
    .filter((b) => b.isDefault)
    .map((b) => ({ bankName: b.bankName, accountLine: b.accountLine }));
  const footer = presets.footer.find((f) => f.isDefault);
  const stamp = presets.stamp.find((s) => s.isDefault);
  const identity = presets.identity.find((x) => x.isDefault);
  return {
    banks: banks.length ? banks : undefined,
    footerHtml: footer?.html,
    stampUrl: stamp?.imageUrl,
    identity: identity
      ? { rc: identity.rc, artImp: identity.artImp, nif: identity.nif, nis: identity.nis }
      : undefined,
  };
}

export function emptyDraft(company: CompanySettings): DocumentDraft {
  const now = new Date();
  return {
    type: 'proforma',
    wilayaCity: 'MENIAA',
    date: now.toISOString(),
    validUntil: addDaysIso(now, 15),
    client: { ...EMPTY_CLIENT },
    items: [],
    factureExtras: {},
    remise: 0,
    banks: [{ bankName: '', accountLine: '' }],
    footerHtml: '',
    stampUrl: '',
    stampBlank: false,
    companySnapshot: company,
    totals: { sousTotalHT: 0, tva: 0, totalTTC: 0 },
    amountInWords: '',
  };
}
