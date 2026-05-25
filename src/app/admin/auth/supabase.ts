import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

export const SUPABASE_URL = `https://${projectId}.supabase.co`;
export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1/make-server-0c561120`;

/**
 * Auth headers for the *public* (unauthenticated) edge-function endpoints.
 * The Supabase gateway verifies a JWT on every function request; the anon key
 * is a valid public JWT, so anonymous callers must still send it or the gateway
 * rejects them with 401 before the function runs. (Authenticated admin calls
 * use the user's session token instead — see AuthProvider.)
 */
export const FUNCTIONS_HEADERS = { Authorization: `Bearer ${publicAnonKey}` } as const;

export const supabase = createClient(SUPABASE_URL, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'agroespace.admin.auth',
  },
});

/**
 * Session-less client for *public* visitors (no admin auth). Used to upload
 * proforma documents straight to Storage via signed upload tokens. Kept
 * separate from `supabase` so it never touches the admin session.
 */
export const supabasePublic = createClient(SUPABASE_URL, publicAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
