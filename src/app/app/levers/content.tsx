'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import JdReminderLever from './JdReminderLever';
import LogReportLever from './LogReportLever';

// Levers page — vertical stack of independent console cards, one
// per lever, on a scrollable page.
//
// Each lever lives on its own warm-charcoal control panel with
// brass-screw corners. Per-lever options (Preview, Recipients,
// History, Set automation, etc.) live inside the lever component
// and render on its own card so a new lever can ship without
// reshuffling sibling controls.
//
// The page itself is just the standard /app scroll container — no
// horizontal overflow trickery — so adding levers down the road
// is "stack another card", not "find more horizontal room".

function ConsoleCard({
  label,
  authorizedEmail,
  children,
}: {
  label: string;
  authorizedEmail?: string | null;
  children: ReactNode;
}) {
  return (
    <section
      className="relative rounded-3xl p-6 sm:p-8 lg:p-10 overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, #2a1812 0%, #1c100b 55%, #14090a 100%)',
        boxShadow:
          'inset 0 2px 12px rgba(0,0,0,0.55), 0 16px 38px -18px rgba(0,0,0,0.65)',
      }}
    >
      {/* Brass screws in the four corners — same shape as before so
          the visual language stays consistent across every card on
          the page. */}
      {(['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'] as const).map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          className={`absolute ${pos} w-3 h-3 rounded-full`}
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #f5d27e 0%, #c08e3c 55%, #6b4a1a 95%)',
            boxShadow:
              'inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 1px rgba(0,0,0,0.4)',
          }}
        />
      ))}

      <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          {label}
        </p>
        {authorizedEmail && (
          <p className="text-[10px] font-mono text-white/35 truncate">
            Authorized: {authorizedEmail}
          </p>
        )}
      </div>

      {/* Lever lives in the middle of the panel. Centered so the
          card is the lever — not a row of levers crammed shoulder
          to shoulder. */}
      <div className="flex justify-center">
        {children}
      </div>
    </section>
  );
}

export default function LeversContent() {
  const { user, isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return <div className="px-6 py-10 text-sm text-foreground/60">Sign in required.</div>;
  }
  if (!isSuperAdmin) {
    return (
      <div className="px-6 py-10 max-w-xl">
        <h1 className="text-xl font-semibold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Levers
        </h1>
        <p className="text-sm text-foreground/65">
          Levers are super-admin-only broadcast tools (full-screen popups
          pushed to specific groups of teammates). Ask a super admin if you
          need to pull one.
        </p>
        <Link href="/app" className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-5 sm:mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary mb-1.5">
          Super-admin tools
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Levers
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-2xl">
          Pull a lever to broadcast a full-screen popup to the matching
          cohort. Each lever&rsquo;s count is live — the cohort behind it
          updates as teammates complete the action. Each card below carries
          its own options and automation state.
        </p>
      </header>

      {/* Vertical stack of console cards. Tall by design — the page
          scrolls — so each lever owns its own visual real estate and
          its options strip never has to share with another lever. */}
      <div className="space-y-6 sm:space-y-8">
        <ConsoleCard label="JD Reminder" authorizedEmail={user.email}>
          <JdReminderLever />
        </ConsoleCard>

        <ConsoleCard label="Log Report" authorizedEmail={user.email}>
          <LogReportLever />
        </ConsoleCard>
        {/* Future levers stack here as additional ConsoleCard
            children. Same chrome, independent state. */}
      </div>

      <p className="mt-4 text-[11px] text-foreground/45 text-center">
        Every pull writes to the activity feed with the recipient list and
        attribution. Recipients can dismiss the popup, but it returns next
        load until the underlying action is complete.
      </p>
    </div>
  );
}
