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
