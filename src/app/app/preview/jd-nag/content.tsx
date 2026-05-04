'use client';

import Link from 'next/link';
import { useState } from 'react';
import JdSignatureNagModal from '../../JdSignatureNagModal';

// Dummy data — chosen so the nag reads believably in the preview.
// Sent 5 days ago so the "5 days waiting" badge renders. The id is
// arbitrary; clicking "Sign now" will navigate to /app/sign/<id>
// which will 404 (or land in the real sign route if that id ever
// matched). The "Continue without signing" button just toggles the
// preview off so you can re-open it.
const DUMMY = {
  id: '00000000-0000-0000-0000-000000000000',
  title: 'Director of Marketing & Admissions — 2026 Revision',
  sent_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
};
const DUMMY_DAYS = 5;

export default function PreviewContent() {
  const [open, setOpen] = useState(true);
  const [variantDays, setVariantDays] = useState<number>(DUMMY_DAYS);

  const sentIso = new Date(Date.now() - variantDays * 24 * 60 * 60 * 1000).toISOString();

  return (
    <div className="relative min-h-full p-6 sm:p-10">
      {/* Background warm orbs so the modal's frosted backdrop has
          something to refract — mirrors the home dashboard. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-orange-300/35 blur-[120px]" />
        <div className="absolute top-1/4 -right-20 w-[360px] h-[360px] rounded-full bg-rose-200/40 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 w-[480px] h-[480px] rounded-full bg-amber-200/35 blur-[130px]" />
      </div>

      <header className="mb-6">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
          Preview · hidden route
        </p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          JD signature nag — visual preview
        </h1>
        <p className="mt-1 text-sm text-foreground/60 max-w-xl" style={{ fontFamily: 'var(--font-body)' }}>
          Renders <code className="text-[12px] bg-warm-bg px-1 py-0.5 rounded">JdSignatureNagModal</code> with dummy data so we can iterate on the design without a real overdue signature on the account. Not in the sidebar, reachable by URL only.
        </p>
      </header>

      {/* Controls — re-open + days slider so we can sanity-check the
          "1 day" / "5 days" / "30 days" pluralization and number
          rendering. */}
      <div className="rounded-2xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-xl shadow-sm p-4 max-w-xl mb-6">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
          Controls
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={open}
            className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Re-open modal
          </button>
          <label className="flex items-center gap-2 text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
            Days waiting:
            <input
              type="number"
              value={variantDays}
              min={1}
              max={365}
              onChange={(e) => setVariantDays(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-md border border-black/10 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <Link
            href="/app"
            className="ml-auto text-xs font-semibold uppercase tracking-wider text-foreground/50 hover:text-primary transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Back to dashboard →
          </Link>
        </div>
      </div>

      {/* Filler so the dashboard-feel-behind-the-scrim is visible
          when the modal is closed. */}
      <div className="rounded-3xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] p-8 max-w-3xl">
        <p className="text-foreground/70 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
          Imagine the actual dashboard here. When the modal is open the scrim covers everything; when it is dismissed, this card represents whatever the user came back to.
        </p>
      </div>

      {open && (
        <JdSignatureNagModal
          signature={{ id: DUMMY.id, title: DUMMY.title, sent_at: sentIso }}
          daysWaiting={variantDays}
          onContinueWithoutSigning={() => setOpen(false)}
        />
      )}
    </div>
  );
}
