// Shared helper so every place that renders a staff name displays
// their credentials suffix the same way: "Connie Smith, LMSW".
//
// Free-text on purpose — credentials varies wildly in practice
// (LMSW, MD/MPH, LISAC, PhD, etc.), and any structured taxonomy we
// invented would just rot. We do trim and strip a leading comma /
// "and" so callers can paste either "LMSW" or ", LMSW" without
// ending up with double commas.

export function formatNameWithCredentials(
  name: string | null | undefined,
  credentials: string | null | undefined,
): string {
  const baseName = (name ?? '').trim();
  if (!baseName) return '';
  const creds = (credentials ?? '').trim().replace(/^[,\s]+/, '');
  if (!creds) return baseName;
  return `${baseName}, ${creds}`;
}

// Split a free-text credentials string into individual chips.
// Splits on commas, trims whitespace, keeps multi-word tokens intact
// (e.g. "EMDRIA Certified" stays as one chip), and drops empties.
// Tokens like "MD/MPH" or "RYT-200" are preserved as single items
// because the slash and hyphen are inside the token.
export function splitCredentials(
  credentials: string | null | undefined,
): string[] {
  const raw = (credentials ?? '').trim();
  if (!raw) return [];
  return raw
    .split(/[,;]/g)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}
