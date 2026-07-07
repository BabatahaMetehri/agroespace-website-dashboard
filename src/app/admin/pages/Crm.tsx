import { useAdminAuth } from "../auth/AuthProvider";
import { nameFromEmail } from "../auth/identity";
import { ClientsCRM } from "../../crm/ClientsCRM";

/**
 * Admin CRM page. Renders the shared ClientsCRM tool, attributing notes to the
 * signed-in admin. Storage is client-side (localStorage) for now — see
 * useCrmStore; it will be pointed at Supabase endpoints once billing is back.
 */
export const Crm = () => {
  const { user } = useAdminAuth();
  const author = user?.email ? nameFromEmail(user.email) : undefined;
  return <ClientsCRM author={author} inAdmin />;
};
