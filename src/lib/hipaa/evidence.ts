import type { HipaaCheck } from './types';
import { getAdminSupabase } from '@/lib/supabase-server';

export interface HipaaEvidenceRow {
  check_id: string;
  status_override: 'pass' | 'fail' | null;
  note: string | null;
  evidence_url: string | null;
  expires_at: string | null;
  confirmed_by: string | null;
  confirmed_at: string;
  updated_at: string;
}

// Fold per-check evidence overrides into the scanner output. A
// non-expired evidence row with status_override = 'pass' flips a
// 'manual' check to 'pass' (verified by a human); 'fail' forces
// the check into the roadmap. Expired evidence is IGNORED — the
// scanner reverts to its computed status so renewals get caught.
export async function applyEvidenceOverrides(checks: HipaaCheck[]): Promise<{
  merged: HipaaCheck[];
  evidence: Map<string, HipaaEvidenceRow>;
}> {
  const evidence = new Map<string, HipaaEvidenceRow>();
  try {
    const admin = getAdminSupabase();
    const { data } = await admin
      .from('hipaa_check_evidence')
      .select('*');
    const rows = (data ?? []) as HipaaEvidenceRow[];
    const now = Date.now();
    for (const row of rows) {
      const expired = row.expires_at && new Date(row.expires_at).getTime() < now;
      if (expired) continue;
      evidence.set(row.check_id, row);
    }
  } catch {
    // Best-effort — overrides are an opt-in layer, not core scoring.
  }
  const merged = checks.map((c) => {
    const ev = evidence.get(c.id);
    if (!ev || !ev.status_override) return c;
    // Stamp the evidence note into the check so the UI surfaces
    // WHY a check is now passing/failing without a separate fetch.
    const tag = ev.status_override === 'pass' ? '✓ Verified by admin' : '✗ Overridden by admin';
    return {
      ...c,
      status: ev.status_override,
      evidence: ev.note
        ? `${tag}: ${ev.note}`
        : `${tag} on ${new Date(ev.confirmed_at).toLocaleDateString()}.`,
    };
  });
  return { merged, evidence };
}
