/* Supabase project info - reads from environment variables */

export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "";
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!projectId || !publicAnonKey) {
  console.warn(
    "Missing VITE_SUPABASE_PROJECT_ID or VITE_SUPABASE_ANON_KEY environment variables. " +
    "Add them to your .env file (local) or Vercel environment variables (production)."
  );
}