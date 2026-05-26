/**
 * Turn an admin email into a readable name. Our admin accounts are shaped
 * `firstname.lastname@agroespace.com`, so the local part maps cleanly to a
 * display name: "mohamed.taha@agroespace.com" → "Mohamed Taha".
 * Falls back to the raw email (or empty string) when it doesn't fit the shape.
 */
export function nameFromEmail(email?: string | null): string {
  if (!email) return '';
  const local = email.split('@')[0] ?? '';
  if (!local) return email;
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
    .trim();
  return name || email;
}
