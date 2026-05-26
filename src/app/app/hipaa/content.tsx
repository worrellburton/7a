'use client';

// /app/hipaa · Technical safeguards audit.
//
// HEAVY CAVEAT (rendered prominently on the page): this is a
// CODE-BASED check of HIPAA Security Rule technical safeguards.
// HIPAA compliance also requires BAAs with every vendor, written
// policies, workforce training, breach-notification procedures,
// and physical safeguards — none of which a code scanner can
// certify. Every check that depends on a contract or a policy
// is flagged 'manual' with a verification step.

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import {
  CATEGORY_LABEL,
  CATEGORY_REF,
  type HipaaCategory,
  type HipaaCheck,
  type HipaaScanResult,
} from '@/lib/hipaa/types';

const CATEGORY_ORDER: HipaaCategory[] = [
  'transport', 'access', 'auth', 'audit', 'integrity', 'data', 'baa', 'admin',
];

export default function HipaaContent() {
  const { session, isSuperAdmin } = useAuth();
  const [result, setResult] = useState<HipaaScanResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/45 mb-2">Compliance</p>
        <h1 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          HIPAA technical-safeguards audit
        </h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">Super-admin only.</p>
          <p>This page exposes infrastructure-level findings that aren&rsquo;t suitable for general staff. Ask a super admin to share specific items if you need them.</p>
        </div>
      </div>
    );
  }

  const runScan = async () => {
    if (!session?.access_token || running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/hipaa/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : `HTTP ${res.status}`);
        return;
      }
      setResult(json as HipaaScanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  // Run the scan once on mount so the page has data without
  // requiring a click — but expose the manual re-run button.
  useEffect(() => {
    if (session?.access_token && !result && !running) void runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Compliance</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            HIPAA technical-safeguards audit
          </h1>
          <p className="mt-1.5 text-sm text-foreground/65 max-w-2xl">
            Runs every check the code can honestly answer against the live codebase + the Supabase project.
            Items the code can&rsquo;t answer (BAAs, training, policies) are flagged{' '}
            <span className="font-semibold text-amber-700">MANUAL</span> with the verification step spelled out.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runScan()}
          disabled={running}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {running ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              Analyzing codebase…
            </>
          ) : (
            <>↻ Analyze codebase</>
          )}
        </button>
      </header>

      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 mb-6 text-[12.5px] text-amber-900 leading-relaxed">
        <p className="font-bold uppercase tracking-[0.18em] text-[10.5px] mb-1">Read this first</p>
        <p>
          This tool checks <strong>technical safeguards</strong> only. HIPAA compliance also requires <strong>signed BAAs with every vendor</strong>{' '}
          (Vercel, Supabase, Resend, Anthropic, CTM, Sentry, Google), a designated Security Officer, workforce training, and written breach-notification procedures.
          The score below is <em>NOT</em> a certification of HIPAA compliance — treat it as one input into a real risk assessment with a qualified compliance officer.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 mb-6 text-[12.5px] text-rose-900">
          {error}
        </div>
      )}

      {!result && !running && !error && (
        <p className="text-sm text-foreground/55 italic">Click <strong>Analyze codebase</strong> to run the scan.</p>
      )}

      {running && !result && (
        <div className="rounded-xl border border-black/10 bg-white p-10 text-center">
          <span className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-foreground/65">Running every check against the live code + Supabase…</p>
        </div>
      )}

      {result && (
        <>
          {/* Score card */}
          <section className="rounded-2xl border border-black/10 bg-gradient-to-br from-white to-warm-bg/40 px-6 py-5 mb-6 flex items-center justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-foreground/55 mb-1">Technical-safeguards score</p>
              <p className="text-5xl font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: scoreColor(result.tech_score) }}>
                {result.tech_score}<span className="text-2xl text-foreground/45">/100</span>
              </p>
              <p className="mt-2 text-[11.5px] text-foreground/55 max-w-md">
                Weighted ratio of <span className="text-emerald-700 font-semibold">pass</span> vs <span className="text-rose-700 font-semibold">fail</span> checks.{' '}
                <strong>Manual checks do not count toward this score</strong> — they appear in the roadmap below as next steps that require a human.
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11.5px]">
              <Pill label="Pass" count={result.pass_count} tone="emerald" />
              <Pill label="Fail" count={result.fail_count} tone="rose" />
              <Pill label="Manual" count={result.manual_count} tone="amber" />
              <div className="text-[10.5px] text-foreground/45 tabular-nums">
                Scanned {new Date(result.ran_at).toLocaleString()}
              </div>
            </div>
          </section>

          {/* Checklist by category */}
          {CATEGORY_ORDER.map((cat) => {
            const items = result.checks.filter((c) => c.category === cat);
            if (items.length === 0) return null;
            const passCount = items.filter((i) => i.status === 'pass').length;
            return (
              <section key={cat} className="rounded-2xl border border-black/10 bg-white px-5 py-4 mb-4">
                <header className="flex items-baseline justify-between mb-3">
                  <div>
                    <p className="text-[10.5px] font-bold tracking-[0.22em] uppercase text-primary">{CATEGORY_REF[cat]}</p>
                    <h2 className="text-base font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                      {CATEGORY_LABEL[cat]}
                    </h2>
                  </div>
                  <p className="text-[10.5px] text-foreground/45 tabular-nums">
                    {passCount}/{items.length} passing
                  </p>
                </header>
                <ul className="space-y-2.5">
                  {items.map((c) => <CheckRow key={c.id} c={c} />)}
                </ul>
              </section>
            );
          })}

          {/* Roadmap to compliance */}
          <section className="rounded-2xl border border-primary/30 bg-primary/[0.04] px-5 py-4 mt-6">
            <p className="text-[10.5px] font-bold tracking-[0.22em] uppercase text-primary">Roadmap to compliance</p>
            <h2 className="text-lg font-bold text-foreground mt-0.5 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Concrete next steps
            </h2>
            <p className="text-[12px] text-foreground/65 mb-3">
              Every check that&rsquo;s either failing or needs manual verification, with the exact remediation. Tackle <span className="font-semibold text-rose-700">fail</span> items first — they&rsquo;re live technical gaps.
            </p>
            <ol className="space-y-2 text-[13px]">
              {[...result.checks.filter((c) => c.status === 'fail'), ...result.checks.filter((c) => c.status === 'manual')]
                .map((c, i) => (
                  <li key={c.id} className="flex gap-3">
                    <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-white text-[11px] font-bold tabular-nums">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                        <span className={`text-[9.5px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded ${
                          c.status === 'fail' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                        }`}>{c.status}</span>
                        <span className="text-[10.5px] font-semibold text-foreground/55">{c.ref}</span>
                        <span className="text-[13px] font-semibold text-foreground">{c.question}</span>
                      </div>
                      <p className="text-[12px] text-foreground/70 leading-relaxed">{c.remediation}</p>
                    </div>
                  </li>
                ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}

function Pill({ label, count, tone }: { label: string; count: number; tone: 'emerald' | 'rose' | 'amber' }) {
  const toneClass =
    tone === 'emerald' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
    tone === 'rose' ? 'bg-rose-50 text-rose-800 border-rose-200' :
    'bg-amber-50 text-amber-900 border-amber-200';
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11.5px] font-semibold ${toneClass}`}>
      <span>{label}</span>
      <span className="tabular-nums">{count}</span>
    </div>
  );
}

function CheckRow({ c }: { c: HipaaCheck }) {
  const statusClass =
    c.status === 'pass' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
    c.status === 'fail' ? 'bg-rose-50 text-rose-800 border-rose-200' :
    'bg-amber-50 text-amber-900 border-amber-200';
  return (
    <li className="rounded-lg border border-black/5 bg-white/60 px-3 py-2.5">
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-[0.14em] border ${statusClass}`}>
          {c.status === 'pass' ? '✓ Pass' : c.status === 'fail' ? '✗ Fail' : '? Manual'}
        </span>
        <span className="text-[10px] font-semibold text-foreground/45 tabular-nums">{c.ref}</span>
        <span className="text-[10px] text-foreground/40">weight {c.weight}/5</span>
      </div>
      <p className="text-[13.5px] font-semibold text-foreground">{c.question}</p>
      <p className="mt-1 text-[12px] text-foreground/65">
        <span className="font-semibold text-foreground/55">Evidence:</span> {c.evidence}
      </p>
      <p className="mt-0.5 text-[12px] text-foreground/65">
        <span className="font-semibold text-foreground/55">{c.status === 'pass' ? 'Stay-passing action' : 'Next step'}:</span> {c.remediation}
      </p>
    </li>
  );
}

function scoreColor(score: number): string {
  if (score >= 85) return '#047857'; // emerald
  if (score >= 65) return '#bc6b4a'; // copper
  if (score >= 40) return '#b45309'; // amber
  return '#be123c';                  // rose
}
