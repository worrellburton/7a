// Company identity helpers. A "company" on the contacts side is just
// the free-text contacts.company string — there's no companies table,
// so a company is identified by its NORMALIZED key and addressed in
// the URL by a derived slug. Both helpers are pure + shared by the
// client (linking) and the server (resolving), so a link always
// round-trips to the same company page.

/** Stable identity for a company: lower-cased, whitespace-collapsed. */
export function normalizeCompanyKey(name: string | null | undefined): string {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * URL slug for a company name. Not perfectly reversible (punctuation
 * is dropped), so the server resolves a slug by recomputing it across
 * the distinct company names and matching — there are only a few
 * hundred, so this is cheap and never goes stale. A short, stable
 * suffix derived from the normalized key disambiguates names that
 * would otherwise slugify identically ("St. Luke's" vs "St Lukes").
 */
export function companySlug(name: string | null | undefined): string {
  const key = normalizeCompanyKey(name);
  const base = key
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const suffix = shortHash(key);
  if (!base) return `company-${suffix}`;
  return `${base}-${suffix}`;
}

// Tiny deterministic hash (djb2) → 4 base36 chars. Enough entropy to
// separate near-identical names without bloating the URL.
function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).slice(0, 4).padStart(4, '0');
}
