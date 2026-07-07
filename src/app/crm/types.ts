/**
 * CRM — Gestion de la relation client.
 *
 * Standalone client registry (per the chosen design): the CRM owns its own
 * client records rather than deriving them from quotes/documents. Persistence
 * is client-side (localStorage) for now — see useCrmStore. The shapes below are
 * intentionally close to a future Supabase table so wiring real storage later
 * is a drop-in.
 */

export type ClientStatus =
  | "prospect"
  | "contacted"
  | "quoted"
  | "negotiation"
  | "won"
  | "lost";

export type NoteKind = "visit" | "call" | "note";

export interface CrmNote {
  id: string;
  body: string;
  createdAt: string; // ISO
  author?: string;
  kind: NoteKind;
}

export type DocKind = "proforma" | "facture";
export type DocStatus = "draft" | "sent" | "paid" | "cancelled";

export interface CrmDocument {
  id: string;
  kind: DocKind;
  number: string; // e.g. PRO-2026-014 / FAC-2026-021
  date: string; // ISO date
  amountDA: number; // total TTC in Algerian dinars
  status: DocStatus;
  label?: string;
}

export type ActivityType =
  | "created"
  | "status"
  | "note"
  | "document"
  | "edit";

export interface CrmActivity {
  id: string;
  type: ActivityType;
  at: string; // ISO
  text: string;
}

export interface CrmClient {
  id: string;
  company: string;
  contact: string; // main contact person
  phone?: string;
  email?: string;
  wilaya?: string;
  address?: string;
  sector?: string; // type of farming / activity
  source?: string; // lead source (salon, recommandation, site web…)
  status: ClientStatus;
  createdAt: string; // ISO
  /** Next follow-up ("prochaine relance") date — ISO, optional. */
  nextActionAt?: string;
  notes: CrmNote[];
  documents: CrmDocument[];
  history: CrmActivity[];
}

// ── Display metadata ─────────────────────────────────────────────────────────
export const CLIENT_STATUSES: {
  value: ClientStatus;
  label: string;
  cls: string; // badge classes (admin dark theme)
  dot: string; // pipeline dot color
}[] = [
  { value: "prospect", label: "Prospect", cls: "bg-slate-500/15 text-slate-300 border-slate-500/25", dot: "bg-slate-400" },
  { value: "contacted", label: "Contacté", cls: "bg-blue-500/15 text-blue-300 border-blue-500/25", dot: "bg-blue-400" },
  { value: "quoted", label: "Devis envoyé", cls: "bg-purple-500/15 text-purple-300 border-purple-500/25", dot: "bg-purple-400" },
  { value: "negotiation", label: "Négociation", cls: "bg-amber-500/15 text-amber-300 border-amber-500/25", dot: "bg-amber-400" },
  { value: "won", label: "Client", cls: "bg-green-500/15 text-green-300 border-green-500/25", dot: "bg-green-400" },
  { value: "lost", label: "Perdu", cls: "bg-red-500/15 text-red-300 border-red-500/25", dot: "bg-red-400" },
];

/** Ordered pipeline used by the visual stepper (excludes the terminal "lost"). */
export const PIPELINE: ClientStatus[] = [
  "prospect",
  "contacted",
  "quoted",
  "negotiation",
  "won",
];

export const statusMeta = (s: ClientStatus) =>
  CLIENT_STATUSES.find((x) => x.value === s) ?? CLIENT_STATUSES[0];

export const DOC_STATUSES: { value: DocStatus; label: string; cls: string }[] = [
  { value: "draft", label: "Brouillon", cls: "bg-white/10 text-white/60 border-white/15" },
  { value: "sent", label: "Envoyée", cls: "bg-blue-500/15 text-blue-300 border-blue-500/25" },
  { value: "paid", label: "Payée", cls: "bg-green-500/15 text-green-300 border-green-500/25" },
  { value: "cancelled", label: "Annulée", cls: "bg-red-500/15 text-red-300 border-red-500/25" },
];

export const docStatusMeta = (s: DocStatus) =>
  DOC_STATUSES.find((x) => x.value === s) ?? DOC_STATUSES[0];

export const NOTE_KINDS: { value: NoteKind; label: string }[] = [
  { value: "visit", label: "Visite" },
  { value: "call", label: "Appel" },
  { value: "note", label: "Note" },
];

/** Common southern-Algeria wilayas (pivot country) for the client form. */
export const WILAYAS = [
  "Adrar",
  "Timimoun",
  "Ghardaïa",
  "El Meniaa",
  "Ouargla",
  "Touggourt",
  "El Oued",
  "Biskra",
  "Béchar",
  "Béni Abbès",
  "Illizi",
  "Djanet",
  "Tamanrasset",
  "Naâma",
  "El Bayadh",
  "Laghouat",
  "Djelfa",
  "Autre",
];
