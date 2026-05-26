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
  /** Short label from the product preset ("Libellé") — used for a concise PDF filename. */
  label?: string;
}

export interface FactureExtras {
  /** @deprecated replaced by free-text notesHtml — kept so old records still read. */
  orderNo?: string;
  /** @deprecated replaced by free-text notesHtml — kept so old records still read. */
  contractNo?: string;
  /** Free-text rich note printed under the document title (replaces orderNo/contractNo/objet). */
  notesHtml?: string;
  /** @deprecated replaced by free-text notesHtml — kept so old records still read. */
  objet?: string;
  retenueGarantiePct?: number;
  /** Free-text franchise / tax-exemption note printed near the stamp. */
  franchise?: string;
  /** Payment method, free text (may include a cheque number). */
  paymentMode?: string;
  /** Payment date — stored as ISO; printed dd/mm/yyyy. */
  paymentDate?: string;
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
  /** Gross HT = sum of line montants, before any remise. */
  grossHT?: number;
  /** Fixed discount applied to grossHT (0/undefined when none). */
  remise?: number;
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
  /** Leave the stamp area blank (reserved space) for a physical stamp after printing. */
  stampBlank?: boolean;
  /** Fixed discount (DA) subtracted from the gross HT total. 0/undefined → none. */
  remise?: number;
  companySnapshot: CompanySettings;
  totals: DocTotals;
  amountInWords: string;
  /** Admin email of the creator / last editor (stamped server-side). */
  created_by?: string;
  updated_by?: string;
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

/** When true, the preset is auto-applied to every new document. */
export interface BankPreset { id: number; label: string; bankName: string; accountLine: string; isDefault?: boolean; }
export interface FooterPreset { id: number; label: string; html: string; isDefault?: boolean; }
/** One line within a product preset. A preset bundles one or more of these. */
export interface ProductComponent {
  ref?: string;
  designationHtml: string;
  um: string;
  qty: number;
  /** Optional unit price — many bundle lines are priced as a whole on line 1. */
  puHT?: number;
}

export interface ProductPreset {
  id: number;
  label: string;
  /** The bundle's lines. New presets always use this. */
  components?: ProductComponent[];
  // ── Legacy single-line fields (older presets) — read-only fallback ──
  ref?: string;
  designationHtml?: string;
  um?: string;
  defaultPU?: number;
}
export interface StampPreset { id: number; label: string; imageUrl: string; isDefault?: boolean; }
/** Company registration identifiers — these change occasionally, so they are presettable. */
export interface IdentityPreset {
  id: number; label: string; rc: string; artImp: string; nif: string; nis: string; isDefault?: boolean;
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
