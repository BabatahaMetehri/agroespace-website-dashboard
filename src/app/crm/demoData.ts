import type { CrmClient } from "./types";

/**
 * Demo seed for the CRM preview. Realistic-looking but entirely fictitious
 * Algerian farming clients — no real customer data. Used to populate the
 * localStorage store on first load (and on "reset demo").
 */

const iso = (d: string) => new Date(d).toISOString();

export const DEMO_CLIENTS: CrmClient[] = [
  {
    id: "cli-baraka",
    company: "SARL Domaine El Baraka",
    contact: "Ahmed Benyahia",
    phone: "+213 661 24 18 90",
    email: "contact@elbaraka-agri.dz",
    wilaya: "Adrar",
    address: "Route de Reggane, Adrar",
    sector: "Céréales (blé dur, orge)",
    source: "Salon SIPSA Alger",
    status: "won",
    createdAt: iso("2025-11-03"),
    notes: [
      { id: "n1", body: "Visite du site : 3 parcelles carrées de ~40 ha, forage à 12 L/s disponible. Client très intéressé par le pivot 30 ha.", createdAt: iso("2025-11-10"), author: "karim.messaoudi", kind: "visit" },
      { id: "n2", body: "Devis validé, acompte 30 % reçu. Installation planifiée pour mars.", createdAt: iso("2026-01-15"), author: "karim.messaoudi", kind: "note" },
    ],
    documents: [
      { id: "d1", kind: "proforma", number: "PRO-2025-0182", date: iso("2025-12-01"), amountDA: 14_800_000, status: "sent", label: "2× pivot 30 ha + accessoires" },
      { id: "d2", kind: "facture", number: "FAC-2026-0031", date: iso("2026-02-05"), amountDA: 14_800_000, status: "paid", label: "2× pivot 30 ha — solde" },
    ],
    history: [],
  },
  {
    id: "cli-boumediene",
    company: "Ferme Boumediene",
    contact: "Slimane Boumediene",
    phone: "+213 770 55 32 11",
    email: "s.boumediene@gmail.com",
    wilaya: "Ghardaïa",
    address: "Zelfana, Ghardaïa",
    sector: "Maraîchage + fourrage",
    source: "Recommandation client",
    status: "negotiation",
    createdAt: iso("2026-01-22"),
    notes: [
      { id: "n1", body: "Appel : hésite entre 1× 50 ha et 2× 25 ha. Lui expliquer l'avantage coût du 30 ha. Rappeler jeudi.", createdAt: iso("2026-02-18"), author: "karim.messaoudi", kind: "call" },
    ],
    documents: [
      { id: "d1", kind: "proforma", number: "PRO-2026-0044", date: iso("2026-02-12"), amountDA: 9_600_000, status: "sent", label: "1× pivot 40 ha + canon d'extrémité" },
    ],
    history: [],
  },
  {
    id: "cli-timimoun",
    company: "EARL Timimoun Agri",
    contact: "Fatima Zohra Kadi",
    phone: "+213 656 90 77 40",
    email: "eearl.timimoun@outlook.com",
    wilaya: "Timimoun",
    address: "Ksar Ouled Saïd, Timimoun",
    sector: "Palmeraie + céréales",
    source: "Site web (estimateur)",
    status: "quoted",
    createdAt: iso("2026-02-08"),
    notes: [
      { id: "n1", body: "A utilisé l'estimateur en ligne (85 ha, terrain rectangulaire). Proforma envoyée pour 2× 30 ha + 1× 20 ha.", createdAt: iso("2026-02-14"), author: "site", kind: "note" },
    ],
    documents: [
      { id: "d1", kind: "proforma", number: "PRO-2026-0051", date: iso("2026-02-14"), amountDA: 19_200_000, status: "sent", label: "2× 30 ha + 1× 20 ha" },
    ],
    history: [],
  },
  {
    id: "cli-sudvert",
    company: "GAEC Sud Vert",
    contact: "Rachid Amrani",
    phone: "+213 662 11 88 04",
    wilaya: "El Meniaa",
    address: "El Meniaa centre",
    sector: "Pomme de terre",
    source: "Salon Sud Agro Adrar",
    status: "contacted",
    createdAt: iso("2026-02-20"),
    notes: [
      { id: "n1", body: "Premier contact au salon. Demande documentation technique CP-600 + tarifs indicatifs.", createdAt: iso("2026-02-20"), author: "karim.messaoudi", kind: "visit" },
    ],
    documents: [],
    history: [],
  },
  {
    id: "cli-elnour",
    company: "Coopérative El Nour",
    contact: "Youcef Hadj",
    phone: "+213 550 43 22 90",
    wilaya: "Ouargla",
    sector: "Fourrage (luzerne)",
    source: "Appel entrant",
    status: "prospect",
    createdAt: iso("2026-03-02"),
    notes: [],
    documents: [],
    history: [],
  },
  {
    id: "cli-djanet",
    company: "SARL AgroDjanet",
    contact: "Mohamed Tahar",
    phone: "+213 668 70 15 63",
    email: "agrodjanet@gmail.com",
    wilaya: "Illizi",
    address: "Djanet",
    sector: "Maraîchage",
    source: "Recommandation",
    status: "won",
    createdAt: iso("2025-09-14"),
    notes: [
      { id: "n1", body: "Machine installée et en service depuis octobre. Client satisfait, envisage une 2ᵉ unité l'an prochain.", createdAt: iso("2025-10-28"), author: "karim.messaoudi", kind: "visit" },
    ],
    documents: [
      { id: "d1", kind: "facture", number: "FAC-2025-0210", date: iso("2025-10-02"), amountDA: 7_400_000, status: "paid", label: "1× pivot 25 ha" },
    ],
    history: [],
  },
  {
    id: "cli-kaddour",
    company: "Exploitation Kaddour",
    contact: "Ali Kaddour",
    phone: "+213 771 09 45 12",
    wilaya: "Biskra",
    sector: "Céréales",
    source: "Site web",
    status: "lost",
    createdAt: iso("2025-12-11"),
    notes: [
      { id: "n1", body: "A choisi un concurrent pour raison de délai. Reste ouvert pour l'extension future.", createdAt: iso("2026-01-30"), author: "karim.messaoudi", kind: "call" },
    ],
    documents: [
      { id: "d1", kind: "proforma", number: "PRO-2025-0175", date: iso("2025-12-18"), amountDA: 5_900_000, status: "cancelled", label: "1× pivot 20 ha" },
    ],
    history: [],
  },
];
