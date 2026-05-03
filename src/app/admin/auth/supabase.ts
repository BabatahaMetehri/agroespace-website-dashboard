import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

export const SUPABASE_URL = `https://${projectId}.supabase.co`;
export const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1/make-server-0c561120`;

export const supabase = createClient(SUPABASE_URL, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'agroespace.admin.auth',
  },
});
