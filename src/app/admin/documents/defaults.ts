import type { CompanySettings, ClientInfo, DocumentDraft, BankInfo } from './types';

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
