import { useMemo, useState, type ReactNode } from "react";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Building2,
  Pencil,
  Trash2,
  X,
  ReceiptText,
  FileText,
  Clock,
  StickyNote,
  RotateCcw,
  Users,
  TrendingUp,
  CircleDollarSign,
  ChevronRight,
} from "lucide-react";
import { useCrmStore } from "./useCrmStore";
import {
  CLIENT_STATUSES,
  DOC_STATUSES,
  NOTE_KINDS,
  PIPELINE,
  WILAYAS,
  docStatusMeta,
  statusMeta,
  type ClientStatus,
  type CrmClient,
  type CrmDocument,
  type DocKind,
  type DocStatus,
  type NoteKind,
} from "./types";

const fmtDA = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " DA";
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" }) +
  " · " +
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const digits = (s?: string) => (s ?? "").replace(/[^\d+]/g, "");

export const ClientsCRM = ({ author }: { author?: string }) => {
  const store = useCrmStore();
  const { clients } = store;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<CrmClient | "new" | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.company.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        (c.wilaya ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q)
      );
    });
  }, [clients, query, filter]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const won = clients.filter((c) => c.status === "won").length;
    const active = clients.filter((c) =>
      ["contacted", "quoted", "negotiation"].includes(c.status),
    ).length;
    let invoiced = 0;
    let pending = 0;
    for (const c of clients)
      for (const d of c.documents) {
        if (d.kind === "facture" && d.status === "paid") invoiced += d.amountDA;
        if (d.kind === "proforma" && d.status === "sent") pending += d.amountDA;
      }
    return { total: clients.length, won, active, invoiced, pending };
  }, [clients]);

  return (
    <div className="p-6 md:p-10 max-w-[1500px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-light text-white">
          CRM — Gestion de la relation client
        </h1>
        <p className="text-white/50 text-sm mt-1 max-w-2xl">
          Toutes les informations clients centralisées : état de suivi, notes de visite,
          proformas, factures et historique.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <Stat icon={Users} label="Clients" value={String(stats.total)} />
        <Stat icon={TrendingUp} label="Pipeline actif" value={String(stats.active)} />
        <Stat icon={Building2} label="Clients gagnés" value={String(stats.won)} />
        <Stat icon={CircleDollarSign} label="CA facturé" value={fmtDA(stats.invoiced)} tint />
        <Stat icon={ReceiptText} label="Proformas en cours" value={fmtDA(stats.pending)} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client, wilaya, téléphone…"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-lime"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ClientStatus | "all")}
            className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-lime"
          >
            <option value="all">Tous les statuts</option>
            {CLIENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => store.resetDemo()}
            title="Réinitialiser les données de démonstration"
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setFormFor("new")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime hover:bg-lime-deep text-white text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouveau client
          </button>
        </div>
      </div>

      {/* Master–detail */}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr] items-start">
        {/* List */}
        <div className="space-y-2 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto lg:pr-1">
          {filtered.length === 0 && (
            <div className="text-white/40 text-sm p-6 text-center border border-white/10 rounded-2xl">
              Aucun client.
            </div>
          )}
          {filtered.map((c) => {
            const m = statusMeta(c.status);
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                  active
                    ? "bg-lime/10 border-lime/50"
                    : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-white truncate">{c.company}</div>
                    <div className="text-xs text-white/50 truncate">{c.contact}</div>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${m.cls}`}>{m.label}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-white/40">
                  {c.wilaya && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {c.wilaya}
                    </span>
                  )}
                  {c.documents.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <ReceiptText className="w-3 h-3" /> {c.documents.length}
                    </span>
                  )}
                  {c.notes.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <StickyNote className="w-3 h-3" /> {c.notes.length}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        {selected ? (
          <ClientDetail
            key={selected.id}
            client={selected}
            store={store}
            author={author}
            onEdit={() => setFormFor(selected)}
          />
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center text-center border border-white/10 border-dashed rounded-3xl p-16 text-white/40">
            <Building2 className="w-10 h-10 mb-3 opacity-40" />
            Sélectionnez un client pour voir sa fiche complète.
          </div>
        )}
      </div>

      {formFor && (
        <ClientForm
          initial={formFor === "new" ? null : formFor}
          onClose={() => setFormFor(null)}
          onSave={(data) => {
            if (formFor === "new") {
              const id = store.addClient(data);
              setSelectedId(id);
            } else {
              store.updateClient(formFor.id, data);
            }
            setFormFor(null);
          }}
        />
      )}
    </div>
  );
};

// ── Detail ───────────────────────────────────────────────────────────────────
const ClientDetail = ({
  client,
  store,
  author,
  onEdit,
}: {
  client: CrmClient;
  store: ReturnType<typeof useCrmStore>;
  author?: string;
  onEdit: () => void;
}) => {
  const m = statusMeta(client.status);
  const pipeIdx = PIPELINE.indexOf(client.status);
  const isLost = client.status === "lost";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-light text-white">{client.company}</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${m.cls}`}>{m.label}</span>
            </div>
            <p className="text-white/60 mt-1">{client.contact}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-white/50">
              {client.wilaya && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-lime/70" /> {client.wilaya}
                  {client.address ? ` — ${client.address}` : ""}
                </span>
              )}
              {client.sector && <span>🌱 {client.sector}</span>}
              {client.source && <span className="text-white/40">Source : {client.source}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {client.phone && (
              <>
                <a href={`tel:${digits(client.phone)}`} title="Appeler" className="icon-btn">
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${digits(client.phone).replace(/^\+/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp"
                  className="icon-btn"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} title="E-mail" className="icon-btn">
                <Mail className="w-4 h-4" />
              </a>
            )}
            <button onClick={onEdit} title="Modifier" className="icon-btn">
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Supprimer « ${client.company} » ?`)) store.deleteClient(client.id);
              }}
              title="Supprimer"
              className="icon-btn hover:!text-red-300 hover:!border-red-500/40"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pipeline stepper + status control */}
        <div className="mt-6">
          <div className="flex items-center gap-1.5">
            {PIPELINE.map((s, i) => {
              const reached = !isLost && i <= pipeIdx;
              return (
                <div key={s} className="flex items-center gap-1.5 flex-1 min-w-0">
                  <button
                    onClick={() => store.setStatus(client.id, s)}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      reached ? "bg-lime" : "bg-white/10 hover:bg-white/20"
                    }`}
                    title={statusMeta(s).label}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-wrap gap-1.5">
              {CLIENT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => store.setStatus(client.id, s.value)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    client.status === s.value ? s.cls : "border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <NotesPanel client={client} store={store} author={author} />
        <DocumentsPanel client={client} store={store} />
      </div>

      <HistoryPanel client={client} />
    </div>
  );
};

// ── Notes ────────────────────────────────────────────────────────────────────
const NotesPanel = ({
  client,
  store,
  author,
}: {
  client: CrmClient;
  store: ReturnType<typeof useCrmStore>;
  author?: string;
}) => {
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<NoteKind>("visit");
  return (
    <Panel icon={StickyNote} title="Notes de visite" count={client.notes.length}>
      <div className="mb-4">
        <div className="flex gap-1.5 mb-2">
          {NOTE_KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => setKind(k.value)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                kind === k.value ? "bg-lime/15 text-lime border-lime/30" : "border-white/10 text-white/50 hover:text-white"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Ajouter une note de suivi…"
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-lime resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            disabled={!body.trim()}
            onClick={() => {
              store.addNote(client.id, body, kind, author);
              setBody("");
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime hover:bg-lime-deep disabled:opacity-40 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {client.notes.length === 0 && <Empty text="Aucune note." />}
        {client.notes.map((n) => (
          <div key={n.id} className="rounded-xl bg-white/[0.03] border border-white/5 p-3 group">
            <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
              <span className="uppercase tracking-wider">
                {NOTE_KINDS.find((k) => k.value === n.kind)?.label} · {fmtDateTime(n.createdAt)}
                {n.author ? ` · ${n.author}` : ""}
              </span>
              <button
                onClick={() => store.deleteNote(client.id, n.id)}
                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-300 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{n.body}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
};

// ── Documents ────────────────────────────────────────────────────────────────
const DocumentsPanel = ({
  client,
  store,
}: {
  client: CrmClient;
  store: ReturnType<typeof useCrmStore>;
}) => {
  const [adding, setAdding] = useState(false);
  const total = client.documents.reduce((s, d) => s + d.amountDA, 0);
  return (
    <Panel
      icon={ReceiptText}
      title="Proformas & Factures"
      count={client.documents.length}
      action={
        <button onClick={() => setAdding((v) => !v)} className="text-lime hover:text-lime-deep text-xs inline-flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      }
    >
      {adding && <DocumentForm onAdd={(d) => { store.addDocument(client.id, d); setAdding(false); }} onCancel={() => setAdding(false)} />}
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {client.documents.length === 0 && !adding && <Empty text="Aucun document." />}
        {client.documents.map((d) => {
          const dm = docStatusMeta(d.status);
          return (
            <div key={d.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 p-3 group">
              <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${d.kind === "facture" ? "bg-green-500/10 text-green-300" : "bg-blue-500/10 text-blue-300"}`}>
                {d.kind === "facture" ? <ReceiptText className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{d.number}</span>
                  <select
                    value={d.status}
                    onChange={(e) => store.updateDocument(client.id, d.id, { status: e.target.value as DocStatus })}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border bg-transparent ${dm.cls}`}
                  >
                    {DOC_STATUSES.map((s) => (
                      <option key={s.value} value={s.value} className="bg-[#0f2618]">{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="text-[11px] text-white/40 truncate">
                  {fmtDate(d.date)}{d.label ? ` · ${d.label}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm text-white font-medium">{fmtDA(d.amountDA)}</div>
              </div>
              <button
                onClick={() => store.deleteDocument(client.id, d.id)}
                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-300 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      {client.documents.length > 0 && (
        <div className="flex justify-between text-xs text-white/50 mt-3 pt-3 border-t border-white/10">
          <span>Total</span>
          <span className="text-white font-medium">{fmtDA(total)}</span>
        </div>
      )}
    </Panel>
  );
};

const DocumentForm = ({
  onAdd,
  onCancel,
}: {
  onAdd: (d: Omit<CrmDocument, "id">) => void;
  onCancel: () => void;
}) => {
  const [kind, setKind] = useState<DocKind>("proforma");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<DocStatus>("sent");
  const [label, setLabel] = useState("");
  return (
    <div className="rounded-xl border border-lime/30 bg-lime/[0.06] p-3 mb-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as DocKind)} className="crm-input">
          <option value="proforma" className="bg-[#0f2618]">Proforma</option>
          <option value="facture" className="bg-[#0f2618]">Facture</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as DocStatus)} className="crm-input">
          {DOC_STATUSES.map((s) => (
            <option key={s.value} value={s.value} className="bg-[#0f2618]">{s.label}</option>
          ))}
        </select>
        <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="N° (PRO-2026-…)" className="crm-input" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="crm-input" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Montant TTC (DA)" className="crm-input" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Description" className="crm-input" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-white/50 hover:text-white">Annuler</button>
        <button
          disabled={!number.trim() || !amount}
          onClick={() =>
            onAdd({
              kind,
              number: number.trim(),
              date: new Date(date).toISOString(),
              amountDA: Number(amount) || 0,
              status,
              label: label.trim() || undefined,
            })
          }
          className="px-4 py-1.5 rounded-lg bg-lime hover:bg-lime-deep disabled:opacity-40 text-white text-xs font-semibold"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
};

// ── History ──────────────────────────────────────────────────────────────────
const HistoryPanel = ({ client }: { client: CrmClient }) => (
  <Panel icon={Clock} title="Historique" count={client.history.length}>
    {client.history.length === 0 && <Empty text="Aucune activité." />}
    <ol className="relative border-s border-white/10 ms-2 space-y-4">
      {client.history.map((h) => (
        <li key={h.id} className="ms-5">
          <span className="absolute -start-[7px] mt-1 w-3 h-3 rounded-full bg-lime/70 border-2 border-[#0a1c12]" />
          <div className="text-sm text-white/80">{h.text}</div>
          <div className="text-[11px] text-white/35">{fmtDateTime(h.at)}</div>
        </li>
      ))}
    </ol>
  </Panel>
);

// ── Client form modal ────────────────────────────────────────────────────────
const ClientForm = ({
  initial,
  onSave,
  onClose,
}: {
  initial: CrmClient | null;
  onSave: (data: Partial<CrmClient>) => void;
  onClose: () => void;
}) => {
  const [f, setF] = useState<Partial<CrmClient>>(
    initial ?? { status: "prospect", wilaya: "Adrar" },
  );
  const set = (k: keyof CrmClient, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0f2618] border border-white/10 shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-light text-white">{initial ? "Modifier le client" : "Nouveau client"}</h3>
          <button onClick={onClose} className="icon-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Société / exploitation" full>
            <input value={f.company ?? ""} onChange={(e) => set("company", e.target.value)} className="crm-input" placeholder="SARL Domaine…" />
          </Field>
          <Field label="Contact">
            <input value={f.contact ?? ""} onChange={(e) => set("contact", e.target.value)} className="crm-input" placeholder="Nom du responsable" />
          </Field>
          <Field label="Téléphone">
            <input value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className="crm-input" placeholder="+213 …" />
          </Field>
          <Field label="E-mail">
            <input value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} className="crm-input" placeholder="email@…" />
          </Field>
          <Field label="Wilaya">
            <select value={f.wilaya ?? "Adrar"} onChange={(e) => set("wilaya", e.target.value)} className="crm-input">
              {WILAYAS.map((w) => (
                <option key={w} value={w} className="bg-[#0f2618]">{w}</option>
              ))}
            </select>
          </Field>
          <Field label="Adresse" full>
            <input value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} className="crm-input" placeholder="Commune, lieu-dit…" />
          </Field>
          <Field label="Activité / culture">
            <input value={f.sector ?? ""} onChange={(e) => set("sector", e.target.value)} className="crm-input" placeholder="Céréales, maraîchage…" />
          </Field>
          <Field label="Source">
            <input value={f.source ?? ""} onChange={(e) => set("source", e.target.value)} className="crm-input" placeholder="Salon, site web…" />
          </Field>
          <Field label="Statut" full>
            <select value={f.status ?? "prospect"} onChange={(e) => set("status", e.target.value)} className="crm-input">
              {CLIENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value} className="bg-[#0f2618]">{s.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-white/60 hover:text-white">Annuler</button>
          <button
            disabled={!f.company?.trim()}
            onClick={() => onSave(f)}
            className="px-5 py-2.5 rounded-xl bg-lime hover:bg-lime-deep disabled:opacity-40 text-white text-sm font-semibold"
          >
            {initial ? "Enregistrer" : "Créer le client"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Small shared bits ────────────────────────────────────────────────────────
const Stat = ({ icon: Icon, label, value, tint }: { icon: typeof Users; label: string; value: string; tint?: boolean }) => (
  <div className={`rounded-2xl border p-4 ${tint ? "bg-lime/10 border-lime/25" : "bg-white/[0.03] border-white/10"}`}>
    <Icon className={`w-4 h-4 mb-2 ${tint ? "text-lime" : "text-white/40"}`} />
    <div className="text-lg md:text-xl font-light text-white leading-tight">{value}</div>
    <div className="text-[11px] uppercase tracking-[0.1em] text-white/40 mt-0.5">{label}</div>
  </div>
);

const Panel = ({
  icon: Icon,
  title,
  count,
  action,
  children,
}: {
  icon: typeof Users;
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 text-white/80">
        <Icon className="w-4 h-4 text-lime/70" />
        <span className="font-medium text-sm">{title}</span>
        {count !== undefined && <span className="text-xs text-white/40">({count})</span>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Field = ({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) => (
  <label className={`block ${full ? "col-span-2" : ""}`}>
    <span className="block text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1.5">{label}</span>
    {children}
  </label>
);

const Empty = ({ text }: { text: string }) => (
  <div className="text-white/35 text-sm py-6 text-center">{text}</div>
);
