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
  cf: string;
}

export interface ItemRow {
  ref: string;
  designationHtml: string; // sanitized rich text
  um: string;
  qty: number;
  puHT: number;
  /** TVA rate as a fraction (0.19 = 19 %). Undefined → default 19 % (legacy rows). */
  tvaRate?: number;
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

export interface TvaRateLine {
  rate: number;   // fraction, e.g. 0.19
  base: number;   // HT amount taxed at this rate
  amount: number; // TVA amount for this rate
}

export interface DocTotals {
  sousTotalHT: number;
  tva: number;
  totalTTC: number;
  /** TVA split per distinct rate (one entry when all lines share a rate). */
  tvaByRate?: TvaRateLine[];
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
  banks: BankInfo[];
  /** @deprecated legacy single-bank field — kept so old records still read. */
  bank?: BankInfo;
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

export type PresetKind = 'bank' | 'footer' | 'product' | 'stamp' | 'identity';

export interface BankPreset { id: number; label: string; bankName: string; accountLine: string; }
export interface FooterPreset { id: number; label: string; html: string; }
export interface ProductPreset {
  id: number; label: string; ref: string; designationHtml: string; um: string; defaultPU: number;
}
export interface StampPreset { id: number; label: string; imageUrl: string; }
/** Company registration identifiers — these change occasionally, so they are presettable. */
export interface IdentityPreset {
  id: number; label: string; rc: string; artImp: string; nif: string; nis: string;
}

export interface CountersInfo { proforma_next: number; facture_next: number; }

export interface PaginatedDocuments {
  items: DocumentRecord[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  counts: { all: number; proforma: number; facture: number; cancelled: number };
}
