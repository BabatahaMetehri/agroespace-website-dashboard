import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientStatus,
  CrmActivity,
  CrmClient,
  CrmDocument,
  CrmNote,
  NoteKind,
} from "./types";
import { statusMeta, docStatusMeta } from "./types";
import { DEMO_CLIENTS } from "./demoData";

const KEY = "agroespace.crm.v1";
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function load(): CrmClient[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as CrmClient[];
  } catch {
    /* corrupt / unavailable — fall back to seed */
  }
  return structuredCloneSafe(DEMO_CLIENTS);
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const activity = (type: CrmActivity["type"], text: string): CrmActivity => ({
  id: uid(),
  type,
  at: new Date().toISOString(),
  text,
});

/**
 * Client-side CRM store. Owns the client list, persists it to localStorage, and
 * exposes mutations that also append to each client's activity history.
 * Swap `load`/persist for Supabase calls later — the component API stays the same.
 */
export function useCrmStore() {
  const [clients, setClients] = useState<CrmClient[]>(() =>
    typeof window === "undefined" ? [] : load(),
  );
  const ready = useRef(false);

  // Persist after the initial load.
  useEffect(() => {
    if (!ready.current) {
      ready.current = true;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(clients));
    } catch {
      /* private mode / quota — best effort */
    }
  }, [clients]);

  const patchClient = useCallback(
    (id: string, fn: (c: CrmClient) => CrmClient) => {
      setClients((list) => list.map((c) => (c.id === id ? fn(c) : c)));
    },
    [],
  );

  const addClient = useCallback((data: Partial<CrmClient>) => {
    const id = uid();
    const client: CrmClient = {
      id,
      company: data.company?.trim() || "Nouveau client",
      contact: data.contact?.trim() || "",
      phone: data.phone,
      email: data.email,
      wilaya: data.wilaya,
      address: data.address,
      sector: data.sector,
      source: data.source,
      status: data.status ?? "prospect",
      createdAt: new Date().toISOString(),
      nextActionAt: data.nextActionAt,
      notes: [],
      documents: [],
      history: [activity("created", "Fiche client créée")],
    };
    setClients((list) => [client, ...list]);
    return id;
  }, []);

  const updateClient = useCallback(
    (id: string, patch: Partial<CrmClient>) => {
      patchClient(id, (c) => {
        const statusChanged = patch.status && patch.status !== c.status;
        const hist = statusChanged
          ? activity(
              "status",
              `Statut : ${statusMeta(c.status).label} → ${statusMeta(patch.status as ClientStatus).label}`,
            )
          : activity("edit", "Fiche mise à jour");
        return { ...c, ...patch, history: [hist, ...c.history] };
      });
    },
    [patchClient],
  );

  const setStatus = useCallback(
    (id: string, status: ClientStatus) => updateClient(id, { status }),
    [updateClient],
  );

  const deleteClient = useCallback((id: string) => {
    setClients((list) => list.filter((c) => c.id !== id));
  }, []);

  const addNote = useCallback(
    (id: string, body: string, kind: NoteKind, author?: string) => {
      const note: CrmNote = {
        id: uid(),
        body: body.trim(),
        kind,
        author,
        createdAt: new Date().toISOString(),
      };
      patchClient(id, (c) => ({
        ...c,
        notes: [note, ...c.notes],
        history: [activity("note", `Note ajoutée (${kind})`), ...c.history],
      }));
    },
    [patchClient],
  );

  const deleteNote = useCallback(
    (id: string, noteId: string) => {
      patchClient(id, (c) => ({
        ...c,
        notes: c.notes.filter((n) => n.id !== noteId),
      }));
    },
    [patchClient],
  );

  const addDocument = useCallback(
    (id: string, doc: Omit<CrmDocument, "id">) => {
      const full: CrmDocument = { ...doc, id: uid() };
      patchClient(id, (c) => ({
        ...c,
        documents: [full, ...c.documents],
        history: [
          activity(
            "document",
            `${doc.kind === "facture" ? "Facture" : "Proforma"} ${doc.number} ajoutée`,
          ),
          ...c.history,
        ],
      }));
    },
    [patchClient],
  );

  const updateDocument = useCallback(
    (id: string, docId: string, patch: Partial<CrmDocument>) => {
      patchClient(id, (c) => ({
        ...c,
        documents: c.documents.map((d) =>
          d.id === docId ? { ...d, ...patch } : d,
        ),
        history: patch.status
          ? [
              activity(
                "document",
                `Document ${docStatusMeta(patch.status).label.toLowerCase()}`,
              ),
              ...c.history,
            ]
          : c.history,
      }));
    },
    [patchClient],
  );

  const deleteDocument = useCallback(
    (id: string, docId: string) => {
      patchClient(id, (c) => ({
        ...c,
        documents: c.documents.filter((d) => d.id !== docId),
      }));
    },
    [patchClient],
  );

  const resetDemo = useCallback(() => {
    setClients(structuredCloneSafe(DEMO_CLIENTS));
  }, []);

  return {
    clients,
    addClient,
    updateClient,
    setStatus,
    deleteClient,
    addNote,
    deleteNote,
    addDocument,
    updateDocument,
    deleteDocument,
    resetDemo,
  };
}

export type CrmStore = ReturnType<typeof useCrmStore>;
