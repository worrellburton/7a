'use client';

import Link from 'next/link';

// JD reminder full-screen popup. One component, two modes:
//
//   previewMode=true  — renders inside its parent (absolute fill of
//     parent), no portal, sample data. Used by the admin preview
//     tab so the buttons aren't actionable.
//
//   previewMode=false — fixed full-screen, blocks the page, real
//     data wired in from lever_pulls metadata. Used by the global
//     listener.

export interface JdReminderModalProps {
  /** Recipient's friendly name. Falls back to email or "you" in copy. */
  recipientName?: string | null;
  /** Optional JD title pulled from lever_pulls.metadata.jd_title. */
  jdTitle?: string | null;
  /** Name of the super admin who pulled the lever. */
  pulledByName?: string | null;
  /** Toggle preview vs. live full-screen mode. */
  previewMode?: boolean;
  /** Called when the recipient clicks "Sign now". The live mode
   *  uses this to mark lever_pulls.status = 'completed' AND
   *  navigate to the JD page. */
  onAcknowledge?: () => void;
  /** Called when the recipient clicks "Later". Live mode marks
   *  status = 'dismissed'. Hidden in preview. */
  onDismiss?: () => void;
}

export default function JdReminderModalPreview({
  recipientName,
  jdTitle,
  pulledByName,
  previewMode = false,
  onAcknowledge,
  onDismiss,
}: JdReminderModalProps) {
  const greeting = recipientName ? recipientName.split(' ')[0] : 'Hi there';
  const displayJdTitle = jdTitle ?? 'Sample Position Title';
  const displayPuller = pulledByName ?? 'Bobby';

  // Wrapper: fixed full-screen for live; absolute fill for preview
  // so it stays inside the bordered preview container.
  const wrapperClass = previewMode
    ? 'absolute inset-0 flex items-center justify-center'
    : 'fixed inset-0 z-[100] flex items-center justify-center';

  return (
    <div
      className={wrapperClass}
      role={previewMode ? undefined : 'dialog'}
      aria-modal={previewMode ? undefined : 'true'}
      aria-labelledby="jd-reminder-heading"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* Backdrop — warm-charcoal gradient that matches the brand
          dark sections. Blocks interaction with the page below in
          live mode. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(42,15,10,0.94) 0%, rgba(20,10,8,0.97) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Card */}
      <div
        className={`relative ${previewMode ? 'max-w-[80%] scale-[0.85]' : 'max-w-2xl mx-4'} w-full rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden`}
      >
        <div
          aria-hidden="true"
          className="h-2"
          style={{
            background:
              'linear-gradient(90deg, #d4794a 0%, #bc6b4a 50%, #a45a3d 100%)',
          }}
        />
        <div className="px-8 py-9 lg:px-10 lg:py-10">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-3">
            One thing on your plate
          </p>
          <h1
            id="jd-reminder-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3vw, 2.4rem)',
              lineHeight: 1.05,
            }}
          >
            {greeting}, your job description is ready to sign.
          </h1>
          <p className="mt-5 text-foreground/75 text-base leading-relaxed">
            <span className="font-semibold text-foreground">{displayPuller}</span>{' '}
            sent it your way. Take two minutes to read{' '}
            <span className="italic">{displayJdTitle}</span> and add your
            signature — it&rsquo;s the source of truth for what you own and
            what you&rsquo;re accountable for.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {previewMode ? (
              <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm">
                Open &amp; sign now
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            ) : (
              <Link
                href="/app/job-descriptions"
                onClick={onAcknowledge}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition"
              >
                Open &amp; sign now
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            )}
            {!previewMode && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs text-foreground/55 hover:text-foreground/85 transition-colors px-2 py-2"
              >
                Remind me later
              </button>
            )}
          </div>
          <p className="mt-6 text-[11px] text-foreground/45">
            This popup was triggered by a super admin. It will reappear next
            time you load the app until the JD is signed.
          </p>
        </div>
      </div>
    </div>
  );
}
