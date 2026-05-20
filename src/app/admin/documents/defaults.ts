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
