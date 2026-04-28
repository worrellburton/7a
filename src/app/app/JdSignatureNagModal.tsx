'use client';

import { useRouter } from 'next/navigation';

// Full-screen nag modal that fires on sign-in when a job-description
// signature has been pending for 3+ days. Two outcomes: "Sign now"
// jumps to /app/sign/<id>, "Continue without signing" dismisses for
// the rest of the session (handled by the caller via sessionStorage
// so this component itself stays purely presentational).

export interface JdNagSignature {
  id: string;
  title: string;
  /** ISO timestamp of when the signature request was sent. */
  sent_at: string;
}

interface Props {
  signature: JdNagSignature;
  daysWaiting: number;
  onContinueWithoutSigning: () => void;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function JdSignatureNagModal({ signature, daysWaiting, onContinueWithoutSigning }: Props) {
  const router = useRouter();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="jd-nag-title"
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
    >
      {/* Heavy backdrop — this is intentionally interruptive. The
          dashboard sits behind a frosted scrim so the nag reads as
          the only thing on screen. */}
      <div className="absolute inset-0 bg-foreground/65 backdrop-blur-md" />

      {/* Liquid-glass card matching the dashboard language. */}
      <div className="relative w-full max-w-lg rounded-3xl border border-white/70 bg-white/90 supports-[backdrop-filter]:bg-white/85 backdrop-blur-2xl shadow-[0_28px_80px_-24px_rgba(60,48,42,0.55)] p-7 sm:p-9 text-center">
        {/* Top inner sheen — same recipe as the dashboard cards. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/95 to-transparent"
        />

        {/* Document-with-pen glyph in an amber circle so the nag tone
            reads as urgent-but-warm rather than alarm-bell red. */}
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4 shadow-inner">
          <svg className="w-7 h-7 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3v4a1 1 0 0 0 1 1h4" />
            <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
            <path d="M9 14l2 2 4-4" />
          </svg>
        </div>

        <p
          className="text-[10.5px] font-bold tracking-[0.22em] uppercase text-amber-700/90 mb-2"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {daysWaiting} {daysWaiting === 1 ? 'day' : 'days'} waiting
        </p>
        <h2
          id="jd-nag-title"
          className="text-2xl sm:text-[1.65rem] font-bold text-foreground leading-tight mb-3"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Still waiting for your job description to be signed
        </h2>
        <p
          className="text-sm text-foreground/65 leading-relaxed mb-7 max-w-md mx-auto"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <span className="font-semibold text-foreground">{signature.title}</span> has been waiting since{' '}
          <span className="font-semibold text-foreground">{fmtDate(signature.sent_at)}</span>. It only takes a minute — please review and sign so we can keep moving.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
          <button
            type="button"
            onClick={() => {
              onContinueWithoutSigning();
              router.push(`/app/sign/${signature.id}`);
            }}
            className="px-5 py-3 rounded-full text-sm font-bold uppercase tracking-wider text-white bg-primary hover:bg-primary-dark transition-colors shadow-md"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sign now
          </button>
          <button
            type="button"
            onClick={onContinueWithoutSigning}
            className="px-5 py-3 rounded-full text-sm font-semibold text-foreground/70 bg-warm-bg/70 hover:bg-warm-bg transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Continue without signing
          </button>
        </div>

        <p
          className="text-[11px] text-foreground/40 mt-5"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          You will see this reminder again next time you sign in.
        </p>
      </div>
    </div>
  );
}
