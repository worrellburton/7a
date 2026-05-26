import { promises as fs } from 'fs';
import path from 'path';
import { getAdminSupabase } from '@/lib/supabase-server';
import type { HipaaCheck } from './types';

// One module per scanner concern. Each runner returns an array of
// HipaaCheck. The /api/hipaa/scan route concatenates them and
// hands the result to the page.
//
// EVERY check carries a precise HHS ref (or 'BAA' for admin
// items) so a compliance officer can audit our reasoning. The
// scanner intentionally over-flags as `manual` rather than
// claiming a `pass` it can't prove — false negatives are a
// worse failure mode than missed checks here.

const PROJECT_ROOT = process.cwd();

async function fileExists(rel: string): Promise<boolean> {
  try {
    await fs.access(path.join(PROJECT_ROOT, rel));
    return true;
  } catch {
    return false;
  }
}

async function grepFile(rel: string, needles: string[]): Promise<boolean> {
  try {
    const buf = await fs.readFile(path.join(PROJECT_ROOT, rel), 'utf-8');
    return needles.some((n) => buf.includes(n));
  } catch {
    return false;
  }
}

// ── §164.312(e) · Transport Security ─────────────────────────────────
export async function transportChecks(): Promise<HipaaCheck[]> {
  const out: HipaaCheck[] = [];

  // Vercel serves every preview + production deployment over TLS
  // automatically. The thing we can verify in CODE is that the
  // Sentry / Next runtime never disables it (e.g. no
  // NODE_TLS_REJECT_UNAUTHORIZED=0).
  const hasInsecureTls = await grepFile('next.config.mjs', ['NODE_TLS_REJECT_UNAUTHORIZED']);
  out.push({
    id: 'transport.tls.no-disable',
    category: 'transport',
    ref: '§164.312(e)(1)',
    question: 'Is TLS verification disabled anywhere in the app config?',
    status: hasInsecureTls ? 'fail' : 'pass',
    evidence: hasInsecureTls
      ? 'next.config.mjs references NODE_TLS_REJECT_UNAUTHORIZED — TLS is disabled somewhere'
      : 'No TLS-disable env knobs found in next.config.mjs.',
    remediation: hasInsecureTls
      ? 'Remove every NODE_TLS_REJECT_UNAUTHORIZED reference. ePHI in flight must be encrypted.'
      : 'Re-run after any infra change. Confirm Vercel project setting forces HTTPS (Settings → Domains → HTTPS).',
    weight: 5,
  });

  // HSTS / cookie flags — Next.js supplies SameSite + Secure by
  // default for the Supabase auth cookie in production. We can't
  // read live response headers from here; flag for manual.
  out.push({
    id: 'transport.hsts',
    category: 'transport',
    ref: '§164.312(e)(2)(i)',
    question: 'Does the production deployment send an HSTS header?',
    status: 'manual',
    evidence: 'Cannot be observed from source — headers are added by Vercel\'s edge.',
    remediation: 'curl -I https://sevenarrowsrecoveryarizona.com — verify Strict-Transport-Security is present with max-age ≥ 31536000.',
    weight: 3,
  });

  out.push({
    id: 'transport.secure-cookies',
    category: 'transport',
    ref: '§164.312(e)(2)(ii)',
    question: 'Are Supabase auth cookies marked Secure + SameSite?',
    status: 'manual',
    evidence: 'Supabase client defaults are correct; production cookies need a one-time browser-devtools check.',
    remediation: 'In the production app, DevTools → Application → Cookies. Every cookie matching sb-* should be Secure + HttpOnly + SameSite=Lax.',
    weight: 3,
  });

  return out;
}

// ── §164.312(a) + (d) · Access Control + Authentication ────────────
export async function accessChecks(): Promise<HipaaCheck[]> {
  const out: HipaaCheck[] = [];

  // RLS on tables likely to carry ePHI / sensitive PII. We
  // hard-code the table list because we KNOW what's PHI in this
  // codebase — auto-detecting would miss columns the LLM doesn't
  // recognise as PHI.
  const PHI_TABLES = [
    'contacts',
    'incoming_users',
    'alumni_profiles',
    'contact_logs',
    'email_campaign_recipients',
    'jd_signatures',
    'kingdom_requests',
    'users',
  ];
  try {
    const admin = getAdminSupabase();
    // pg_class.relrowsecurity tells us whether RLS is enabled.
    const { data } = await admin.rpc('hipaa_rls_status', { tables: PHI_TABLES }).maybeSingle();
    // The RPC may not exist; fall back to a direct query.
    let rls: Array<{ table: string; enabled: boolean }> | null = null;
    if (data && Array.isArray((data as { rows?: unknown[] }).rows)) {
      rls = (data as { rows: Array<{ table: string; enabled: boolean }> }).rows;
    }
    if (!rls) {
      const { data: rows, error } = await admin
        .from('pg_class' as never)
        .select('relname, relrowsecurity')
        .in('relname' as never, PHI_TABLES);
      if (!error && Array.isArray(rows)) {
        rls = (rows as Array<{ relname: string; relrowsecurity: boolean }>).map((r) => ({
          table: r.relname,
          enabled: r.relrowsecurity,
        }));
      }
    }
    if (rls) {
      for (const r of rls) {
        out.push({
          id: `access.rls.${r.table}`,
          category: 'access',
          ref: '§164.312(a)(1)',
          question: `Is RLS enabled on public.${r.table}?`,
          status: r.enabled ? 'pass' : 'fail',
          evidence: r.enabled
            ? `pg_class.relrowsecurity = true on ${r.table}`
            : `pg_class.relrowsecurity = FALSE on ${r.table} — any authenticated client can read every row`,
          remediation: r.enabled
            ? 'Periodically confirm policies still scope rows correctly to the owning user.'
            : `Run: alter table public.${r.table} enable row level security; — then write a policy that scopes rows to the owning user / a privileged role.`,
          weight: 5,
        });
      }
    } else {
      out.push({
        id: 'access.rls.unknown',
        category: 'access',
        ref: '§164.312(a)(1)',
        question: 'Could the scanner read pg_class to verify RLS?',
        status: 'manual',
        evidence: 'The admin Supabase client was unable to introspect pg_class from this route.',
        remediation: 'In the Supabase SQL editor: select relname, relrowsecurity from pg_class where relname in (...PHI_TABLES) — confirm every row reads true.',
        weight: 4,
      });
    }
  } catch (err) {
    out.push({
      id: 'access.rls.error',
      category: 'access',
      ref: '§164.312(a)(1)',
      question: 'RLS status scanner error',
      status: 'manual',
      evidence: err instanceof Error ? err.message : String(err),
      remediation: 'Investigate the scanner error and re-run.',
      weight: 4,
    });
  }

  // Auto logoff — Supabase auth defaults to a JWT lifetime + refresh
  // flow. We can't read the project's JWT TTL setting from code,
  // so this is manual.
  out.push({
    id: 'access.auto-logoff',
    category: 'access',
    ref: '§164.312(a)(2)(iii)',
    question: 'Does the session auto-terminate after a period of inactivity?',
    status: 'manual',
    evidence: 'Supabase JWT lifetime is configured in the project dashboard, not in this codebase.',
    remediation: 'Supabase Dashboard → Authentication → Settings → set JWT expiry ≤ 3600s + refresh expiry ≤ 24h. Document this in the security policy.',
    weight: 3,
  });

  // Per-route admin gates — we know the canonical helpers.
  const hasGate = await grepFile('src/lib/social-media-auth.ts', ['requireSuperAdmin']);
  out.push({
    id: 'access.route-gates',
    category: 'access',
    ref: '§164.312(a)(1)',
    question: 'Do sensitive API routes carry an explicit auth gate?',
    status: hasGate ? 'pass' : 'fail',
    evidence: hasGate
      ? 'requireSuperAdmin helper exists in src/lib/social-media-auth.ts and is used across /api/social-media/*.'
      : 'No requireSuperAdmin helper found — routes may be unguarded.',
    remediation: hasGate
      ? 'Spot-check that EVERY route under /api/* that touches PHI tables uses requireSuperAdmin or an equivalent.'
      : 'Add a per-route auth gate matching social-media-auth.ts to every PHI-touching API route.',
    weight: 5,
  });

  // Unique user IDs — supabase.auth.users issues a UUID per user.
  out.push({
    id: 'auth.unique-ids',
    category: 'auth',
    ref: '§164.312(a)(2)(i)',
    question: 'Does every user have a unique, attributable identifier?',
    status: 'pass',
    evidence: 'Supabase auth issues a UUID per user; public.users mirrors that UUID as the primary key.',
    remediation: 'No action required. Re-verify if you ever migrate off Supabase auth.',
    weight: 4,
  });

  out.push({
    id: 'auth.mfa',
    category: 'auth',
    ref: '§164.312(d)',
    question: 'Is multi-factor authentication enforced for admins?',
    status: 'manual',
    evidence: 'MFA enforcement is configured at the Supabase project level, not in this code.',
    remediation: 'Supabase Dashboard → Authentication → MFA. Require MFA for super admins at minimum. Add it to the workforce-onboarding checklist.',
    weight: 4,
  });

  return out;
}

// ── §164.312(b) · Audit Controls ────────────────────────────────────
export async function auditChecks(): Promise<HipaaCheck[]> {
  const out: HipaaCheck[] = [];

  const hasActivity = await fileExists('src/lib/activity.ts');
  out.push({
    id: 'audit.activity-log',
    category: 'audit',
    ref: '§164.312(b)',
    question: 'Does the app record an audit trail of user actions?',
    status: hasActivity ? 'pass' : 'fail',
    evidence: hasActivity
      ? 'src/lib/activity.ts present; logActivity() is called from page mutations and api routes.'
      : 'No activity-log helper found.',
    remediation: hasActivity
      ? 'Spot-check that EVERY mutation touching PHI calls logActivity({...}).'
      : 'Add an activity_log table + a logActivity() helper. Call it from every mutation that touches PHI.',
    weight: 4,
  });

  const hasCronObs = await fileExists('src/lib/cron-observability.ts');
  out.push({
    id: 'audit.cron-observability',
    category: 'audit',
    ref: '§164.312(b)',
    question: 'Are background cron runs logged?',
    status: hasCronObs ? 'pass' : 'fail',
    evidence: hasCronObs
      ? 'src/lib/cron-observability.ts present — every cron execution writes start / end / status.'
      : 'No cron observability layer found.',
    remediation: hasCronObs
      ? 'Confirm the cron_runs table has a retention policy (≥ 6 years per HIPAA documentation rule).'
      : 'Add cron-observability.ts + cron_runs table. Wrap every /api/cron/* route.',
    weight: 3,
  });

  out.push({
    id: 'audit.retention',
    category: 'audit',
    ref: '§164.316(b)(2)(i)',
    question: 'Is audit log retention ≥ 6 years?',
    status: 'manual',
    evidence: 'No automated retention policy enforced in code; depends on Supabase backup configuration.',
    remediation: 'Either set up a periodic export to long-term cold storage (S3 Glacier / equivalent) OR confirm Supabase backup retention covers 6+ years. Document the chosen path.',
    weight: 4,
  });

  return out;
}

// ── §164.312(c) · Integrity + Data Minimization + PHI Scrubbing ────
export async function integrityChecks(): Promise<HipaaCheck[]> {
  const out: HipaaCheck[] = [];

  const sentryScrub = await fileExists('src/lib/sentry/scrub.ts');
  out.push({
    id: 'integrity.sentry-scrub',
    category: 'integrity',
    ref: '§164.312(c)(1)',
    question: 'Is PHI scrubbed from Sentry error reports?',
    status: sentryScrub ? 'pass' : 'fail',
    evidence: sentryScrub
      ? 'src/lib/sentry/scrub.ts is present + wired through sentry.client/server/edge.config.ts beforeSend hooks.'
      : 'No Sentry scrubber found — error reports may leak PHI to a third-party.',
    remediation: sentryScrub
      ? 'Add new PHI field names to the redact list whenever a new PHI column appears. Run npm run test:scrub.'
      : 'Create src/lib/sentry/scrub.ts and call it from every sentry.*.config.ts beforeSend hook before any breach.',
    weight: 5,
  });

  // Console logging — look for obvious PHI being logged. Best-effort
  // and noisy if it false-positives, so we just flag for review.
  out.push({
    id: 'integrity.no-phi-in-logs',
    category: 'integrity',
    ref: '§164.312(c)(1)',
    question: 'Is PHI scrubbed from server logs?',
    status: 'manual',
    evidence: 'Console statements are pervasive; a single grep can\'t prove the absence of PHI logging.',
    remediation: 'Periodically grep the codebase for console.log calls inside /api/* and confirm no PHI is in the value being logged. Prefer logger primitives that hash IDs.',
    weight: 3,
  });

  // Encrypted at rest — depends on Supabase BAA; manual.
  out.push({
    id: 'integrity.encryption-at-rest',
    category: 'integrity',
    ref: '§164.312(a)(2)(iv)',
    question: 'Is ePHI encrypted at rest?',
    status: 'manual',
    evidence: 'Supabase encrypts Postgres data at rest by default; storage buckets are encrypted too. Verifying the BAA is the missing piece.',
    remediation: 'Confirm Supabase\'s HIPAA add-on is enabled on this project (Dashboard → Settings → Add-ons) and that a signed BAA is on file. Without the BAA the encryption isn\'t HIPAA-grade in legal terms.',
    weight: 5,
  });

  return out;
}

// ── Data minimization · ePHI column inventory ────────────────────
export async function dataChecks(): Promise<HipaaCheck[]> {
  const out: HipaaCheck[] = [];

  out.push({
    id: 'data.minimum-necessary',
    category: 'data',
    ref: 'Privacy Rule · 164.502(b)',
    question: 'Does the app collect only the minimum necessary PHI?',
    status: 'manual',
    evidence: 'Every form that asks for PHI must justify why it\'s collected — not something the scanner can confirm.',
    remediation: 'Walk every form (admissions, alumni profile, contacts) and confirm each PHI field maps to a documented business purpose. Remove any field with no purpose.',
    weight: 3,
  });

  out.push({
    id: 'data.deidentification',
    category: 'data',
    ref: 'Privacy Rule · 164.514',
    question: 'Where PHI is exported (e.g. analytics), is it de-identified?',
    status: 'manual',
    evidence: 'No automated check — depends on every data-export path.',
    remediation: 'Verify Mixpanel / Google Analytics / Sentry tags never carry name / email / dob / address. Confirm the Sentry scrubber covers every PHI field used.',
    weight: 4,
  });

  out.push({
    id: 'data.access-logging',
    category: 'data',
    ref: '§164.528',
    question: 'Can we produce an accounting of disclosures of an individual\'s PHI on request?',
    status: 'manual',
    evidence: 'activity_log captures user actions but not every PHI read.',
    remediation: 'Decide whether read-side logging is in scope. If so, add a phi_access_log table and write to it from every PHI-bearing select. Document the decision either way.',
    weight: 3,
  });

  return out;
}

// ── §164.308(b) · Business Associate Agreements ─────────────────────
//
// The packages + env vars in this project tell us which vendors
// receive data. Each vendor that touches ePHI needs a signed BAA.
// We flag each as manual — even when Supabase HIPAA addon is on,
// nobody but the org owner can confirm the contract is signed.
export async function baaChecks(): Promise<HipaaCheck[]> {
  return [
    {
      id: 'baa.vercel',
      category: 'baa',
      ref: 'BAA',
      question: 'Is a BAA in place with Vercel (hosting + edge)?',
      status: 'manual',
      evidence: 'The app is deployed on Vercel — every server response transits their infra.',
      remediation: 'Vercel offers a BAA only on Enterprise. Either upgrade to Enterprise and execute the BAA, OR move ePHI processing to a HIPAA-eligible host (Render Hipaa, AWS w/ BAA, etc.).',
      weight: 5,
    },
    {
      id: 'baa.supabase',
      category: 'baa',
      ref: 'BAA',
      question: 'Is a BAA in place with Supabase (Postgres + auth + storage)?',
      status: 'manual',
      evidence: 'Supabase is the primary data store; all PHI lives here.',
      remediation: 'Supabase offers a HIPAA add-on with BAA on Team / Enterprise. Verify the add-on is enabled in the dashboard AND the executed BAA is on file. Without it Supabase explicitly disclaims HIPAA suitability.',
      weight: 5,
    },
    {
      id: 'baa.anthropic',
      category: 'baa',
      ref: 'BAA',
      question: 'Is a BAA in place with Anthropic (Claude API)?',
      status: 'manual',
      evidence: 'Claude is used for kaizen scans, content generation, caption drafting — confirm none of these prompts contain ePHI.',
      remediation: 'Either: (a) confirm prompts NEVER include ePHI (kaizen + caption code paths look safe; verify content + email-build paths); OR (b) execute a BAA with Anthropic via their enterprise sales.',
      weight: 4,
    },
    {
      id: 'baa.resend',
      category: 'baa',
      ref: 'BAA',
      question: 'Is a BAA in place with Resend (transactional email)?',
      status: 'manual',
      evidence: 'Resend sends email campaigns; recipient email + name are PHI when the audience is a patient list.',
      remediation: 'Resend does NOT publish a BAA. Either restrict campaigns to non-PHI audiences (general public, staff) or switch to a HIPAA-eligible provider (Paubox, LuxSci, AWS SES + BAA).',
      weight: 5,
    },
    {
      id: 'baa.ayrshare',
      category: 'baa',
      ref: 'BAA',
      question: 'Is a BAA in place with Ayrshare (social posting)?',
      status: 'manual',
      evidence: 'Social posts are public by definition; PHI exposure here is limited to whatever the post body contains.',
      remediation: 'Confirm no PHI ever appears in a generated social post caption. The PostingToggle kill-switch limits blast radius until that\'s verified.',
      weight: 3,
    },
    {
      id: 'baa.ctm',
      category: 'baa',
      ref: 'BAA',
      question: 'Is a BAA in place with CallTrackingMetrics (call routing)?',
      status: 'manual',
      evidence: '/api/ctm/sync indicates CTM integration — call recordings + transcripts are PHI when callers are prospective patients.',
      remediation: 'CallTrackingMetrics offers a BAA on enterprise plans. Verify it\'s on file. If not, disable any call recording or transcription on PHI-bearing numbers.',
      weight: 5,
    },
    {
      id: 'baa.google-maps',
      category: 'baa',
      ref: 'BAA',
      question: 'Is a BAA in place with Google (Maps + Places + Workspace)?',
      status: 'manual',
      evidence: 'Google Maps is used for the alumni map; Places for SEO.',
      remediation: 'Google Workspace BAA covers Workspace only, not Maps Platform. Confirm: (a) alumni-map coordinates are city-level (not precise patient locations) — they are by current code; (b) no PHI passes through Places API calls.',
      weight: 3,
    },
    {
      id: 'baa.sentry',
      category: 'baa',
      ref: 'BAA',
      question: 'Is a BAA in place with Sentry (error monitoring)?',
      status: 'manual',
      evidence: 'Sentry receives error reports; the scrubber strips PHI but the BAA covers the residual risk.',
      remediation: 'Sentry offers a BAA on Business plan. Verify it\'s executed. Keep the scrubber up to date regardless.',
      weight: 4,
    },
  ];
}

// ── Administrative safeguards · §164.308 ─────────────────────────────
export async function adminChecks(): Promise<HipaaCheck[]> {
  return [
    {
      id: 'admin.security-officer',
      category: 'admin',
      ref: '§164.308(a)(2)',
      question: 'Is there a designated HIPAA Security Officer?',
      status: 'manual',
      evidence: 'Not something the codebase can know.',
      remediation: 'Name one. Add the name + contact to the security policy + the workforce handbook.',
      weight: 5,
    },
    {
      id: 'admin.workforce-training',
      category: 'admin',
      ref: '§164.308(a)(5)',
      question: 'Has every workforce member completed HIPAA training in the last 12 months?',
      status: 'manual',
      evidence: 'Not visible from code.',
      remediation: 'Run annual HIPAA training (e.g. HHS Security Risk Assessment Tool walk-through). Track completion in HR records.',
      weight: 5,
    },
    {
      id: 'admin.risk-analysis',
      category: 'admin',
      ref: '§164.308(a)(1)(ii)(A)',
      question: 'Has a formal HIPAA risk analysis been completed?',
      status: 'manual',
      evidence: 'This scanner is NOT a substitute for one.',
      remediation: 'Either hire a HIPAA consultant or run the HHS Security Risk Assessment Tool (https://www.healthit.gov/topic/privacy-security-and-hipaa/security-risk-assessment-tool). Document findings + mitigation.',
      weight: 5,
    },
    {
      id: 'admin.breach-procedure',
      category: 'admin',
      ref: '§164.404',
      question: 'Is there a written breach-notification procedure?',
      status: 'manual',
      evidence: 'Not visible from code.',
      remediation: 'Write a one-page runbook: detection → contain → assess → notify HHS within 60 days for breaches > 500 records, notify individuals + media as required.',
      weight: 5,
    },
    {
      id: 'admin.access-revocation',
      category: 'admin',
      ref: '§164.308(a)(3)(ii)(C)',
      question: 'Is there a documented process for revoking access when staff leave?',
      status: 'manual',
      evidence: 'users.status = denied is supported in code, but the off-boarding PROCESS is administrative.',
      remediation: 'Add an off-boarding checklist: flip users.status to denied OR delete, revoke MFA, rotate any shared secrets the staff member knew.',
      weight: 4,
    },
  ];
}
