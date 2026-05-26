import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperAdmin } from '@/lib/social-media-auth';
import {
  transportChecks,
  accessChecks,
  auditChecks,
  integrityChecks,
  dataChecks,
  baaChecks,
  adminChecks,
} from '@/lib/hipaa/checks';
import { scoreOf } from '@/lib/hipaa/types';
import { applyEvidenceOverrides } from '@/lib/hipaa/evidence';

// POST /api/hipaa/scan
//
// Runs every HIPAA technical-safeguards check against the live
// codebase + Supabase project, persists the result for the audit
// trail, and returns the structured payload to the page.
//
// Super-admin only. The compliance officer's audience.

export const dynamic = 'force-dynamic';
// Filesystem + DB introspection — give the scan ~30s headroom.
export const maxDuration = 60;

export async function POST() {
  const supabase = await getServerSupabase();
  const auth = await requireSuperAdmin(supabase);
  if (auth.response) return auth.response;

  // Run every check group in parallel — filesystem + DB calls are
  // I/O bound and don't conflict.
  const groups = await Promise.all([
    transportChecks(),
    accessChecks(),
    auditChecks(),
    integrityChecks(),
    dataChecks(),
    baaChecks(),
    adminChecks(),
  ]);
  const rawChecks = groups.flat();
  // Apply per-check evidence overrides — a super admin can mark
  // a manual check as PASS (with a note + optional URL +
  // optional expiry) via /api/hipaa/evidence. Expired evidence
  // is ignored so the scanner re-flags items that need renewal.
  const { merged: checks } = await applyEvidenceOverrides(rawChecks);

  const tech_score = scoreOf(checks);
  const pass_count = checks.filter((c) => c.status === 'pass').length;
  const fail_count = checks.filter((c) => c.status === 'fail').length;
  const manual_count = checks.filter((c) => c.status === 'manual').length;
  const ran_at = new Date().toISOString();

  // Persist for the audit trail. Best-effort; the scan result is
  // still returned even if the insert fails.
  try {
    const admin = getAdminSupabase();
    await admin.from('hipaa_scans').insert({
      ran_by: auth.user.id,
      ran_at,
      tech_score,
      pass_count,
      fail_count,
      manual_count,
      payload: checks,
    });
  } catch {
    // non-fatal — the scan result still gets back to the page.
  }

  return NextResponse.json({
    ran_at,
    tech_score,
    pass_count,
    fail_count,
    manual_count,
    checks,
  });
}
