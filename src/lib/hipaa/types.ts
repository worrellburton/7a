// HIPAA technical-safeguards check shape — the canonical type
// the scanner produces and the page renders. Every check carries
// an HHS regulation reference (e.g. "164.312(a)(1)") so a
// compliance officer can trace the finding straight back to the
// rule it touches.
//
// IMPORTANT scope statement: this file describes what the
// AUTOMATED scanner can see from CODE. Real HIPAA compliance
// requires BAAs with every vendor + workforce training + written
// policies + breach-notification procedures + physical
// safeguards. Nothing in this codebase can certify those — every
// such requirement appears as a `manual` check with the
// verification step spelled out.

export type HipaaCheckStatus = 'pass' | 'fail' | 'manual';

export type HipaaCategory =
  | 'transport'    // §164.312(e) — Transmission Security
  | 'access'       // §164.312(a) — Access Control
  | 'auth'         // §164.312(d) — Person/entity Authentication
  | 'audit'        // §164.312(b) — Audit Controls
  | 'integrity'    // §164.312(c) — Integrity
  | 'data'         // Data minimization + PHI scrubbing (Privacy Rule)
  | 'baa'          // Business Associate Agreements (admin safeguard)
  | 'admin';       // Other administrative safeguards (policies, training)

export interface HipaaCheck {
  /** Stable id for diffing scans / linking findings to remediation. */
  id: string;
  category: HipaaCategory;
  /** HHS rule reference, e.g. "164.312(a)(1)" or "BAA". */
  ref: string;
  /** Short, plain-English question this check answers. */
  question: string;
  status: HipaaCheckStatus;
  /** What the scanner found — file path, table name, env var, etc. */
  evidence: string;
  /** Concrete next step. For `pass` checks this is the verification a
   *  human should still do periodically; for `fail` / `manual` it's
   *  the actual remediation work. */
  remediation: string;
  /**
   * Importance weight, 1 (cosmetic) → 5 (a fail here is a real
   * HIPAA violation risk). Drives the aggregate technical score.
   */
  weight: 1 | 2 | 3 | 4 | 5;
}

export interface HipaaScanResult {
  ran_at: string;
  /** 0–100. Computed off PASS / FAIL weighted by check.weight.
   *  Manual checks are EXCLUDED from the denominator — they're a
   *  separate column in the UI labelled 'needs human verify'. */
  tech_score: number;
  pass_count: number;
  fail_count: number;
  manual_count: number;
  checks: HipaaCheck[];
}

// Weighted score. Manual checks are not counted in either side
// (they're 'unknown', not 'pass' and not 'fail'). Returns 0..100.
export function scoreOf(checks: HipaaCheck[]): number {
  let earned = 0;
  let possible = 0;
  for (const c of checks) {
    if (c.status === 'manual') continue;
    possible += c.weight;
    if (c.status === 'pass') earned += c.weight;
  }
  if (possible === 0) return 0;
  return Math.round((earned / possible) * 100);
}

export const CATEGORY_LABEL: Record<HipaaCategory, string> = {
  transport: 'Transport security',
  access: 'Access control',
  auth: 'Authentication',
  audit: 'Audit controls',
  integrity: 'Integrity + PHI scrubbing',
  data: 'Data minimization',
  baa: 'Business Associate Agreements',
  admin: 'Administrative safeguards',
};

export const CATEGORY_REF: Record<HipaaCategory, string> = {
  transport: '§164.312(e)',
  access: '§164.312(a)',
  auth: '§164.312(d)',
  audit: '§164.312(b)',
  integrity: '§164.312(c)',
  data: 'Privacy Rule · minimum necessary',
  baa: '§164.308(b) · BAA',
  admin: '§164.308 · Administrative',
};
