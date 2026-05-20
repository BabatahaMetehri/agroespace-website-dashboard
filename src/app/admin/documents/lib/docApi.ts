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
