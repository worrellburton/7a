'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { logActivity } from '@/lib/activity';

// HIPAA attestation gate — drops over any view that surfaces PHI
// (DOB, insurance details, scanned cards, etc.) until the admin
// explicitly acknowledges that the access is for treatment /
// payment / healthcare-operations purposes only. Acknowledgment is
// kept per-tab in sessionStorage (refresh = re-ack) and logged to
// activity_log so we have an audit trail of who looked at PHI and
// when.
//
// Use:
//
//   <HipaaAttestation surfaceId="vob-requests" surfaceLabel="VOBs">
//     <VobsPanel />
//   </HipaaAttestation>
//
// The `surfaceId` is what goes into sessionStorage + the log row;
// pick a stable string per PHI surface so a second PHI page on the
// app (eligibility detail, etc.) prompts again the first time the
// admin lands on it, even within the same session.

interface HipaaAttestationProps {
  /** Stable id per PHI surface — used as the sessionStorage key
   *  and as the target_id on the activity_log row. */
  surfaceId: string;
  /** Human-readable label shown in the modal copy and in the
   *  audit log row. */
  surfaceLabel: string;
  /** Optional override of the path stored in the audit log. */
  surfacePath?: string;
  children: React.ReactNode;
}

const STORAGE_PREFIX = 'sa.hipaa.ack.';

export default function HipaaAttestation({
  surfaceId,
  surfaceLabel,
  surfacePath,
  children,
}: HipaaAttestationProps) {
  const { user } = useAuth();
  const [acknowledged, setAcknowledged] = useState<boolean | null>(null);
  // `null` = still hydrating from sessionStorage so we don't flash
  // either state on first paint.

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.sessionStorage.getItem(STORAGE_PREFIX + surfaceId);
      setAcknowledged(stored === '1');
    } catch {
      // Storage unavailable (privacy mode, SSR slip) — default to
      // showing the gate so PHI never renders without an ack.
      setAcknowledged(false);
    }
  }, [surfaceId]);

  function acknowledge() {
    try {
      window.sessionStorage.setItem(STORAGE_PREFIX + surfaceId, '1');
    } catch {
      // Best-effort — if we can't persist, still let the user
      // through this session; refresh will re-prompt.
    }
    setAcknowledged(true);
    if (user?.id) {
      void logActivity({
        userId: user.id,
        type: 'hipaa.acknowledged',
        targetKind: 'phi_surface',
        targetId: surfaceId,
        targetLabel: surfaceLabel,
        targetPath: surfacePath,
        metadata: { user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null },
      });
    }
  }

  if (acknowledged === null) {
    // Avoid revealing the PHI surface even momentarily before we
    // know whether the user has already ack'd this session.
    return (
      <div className="py-12 flex items-center justify-center text-[12px] text-foreground/45">
        Verifying access…
      </div>
    );
  }

  if (acknowledged) return <>{children}</>;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="HIPAA acknowledgment required"
      className="relative"
    >
      {/* Soft scrim over where the PHI would render, so the gate
          reads as "the table is below this and locked", not "the
          page is empty". */}
      <div className="relative rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-6 sm:px-7 sm:py-8 shadow-sm">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-200 text-amber-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" />
              <path d="M12 11v3" />
              <circle cx="12" cy="8" r=".75" fill="currentColor" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-900/75 mb-1">
              HIPAA · Protected health information
            </p>
            <h2 className="text-base font-semibold text-amber-950" style={{ fontFamily: 'var(--font-display)' }}>
              {surfaceLabel} contains PHI
            </h2>
            <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-amber-950/85">
              <p>
                The records below include patient-identifying information — date
                of birth, insurance details, copies of insurance cards — covered
                under HIPAA&rsquo;s definition of Protected Health Information.
              </p>
              <p>
                By continuing you confirm that:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Your access is for <strong>treatment, payment, or healthcare
                  operations</strong> — not curiosity, screenshots, or sharing
                  outside the organization.
                </li>
                <li>
                  You will <strong>not photograph, copy, or share</strong> any
                  PHI shown here outside the systems Seven Arrows controls.
                </li>
                <li>
                  This acknowledgment is logged with your name, the time, and
                  the surface you opened.
                </li>
              </ul>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                onClick={acknowledge}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-900 text-amber-50 text-xs font-semibold uppercase tracking-wider hover:bg-amber-800 transition-colors"
              >
                I acknowledge — show PHI
              </button>
              <p className="text-[11px] text-amber-900/70">
                Reload of this tab will require a fresh acknowledgment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
