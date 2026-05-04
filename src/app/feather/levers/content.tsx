'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import JdReminderLever from './JdReminderLever';

// Levers page — primed as a horizontal control-room console.
//
// The console is the hero: dark warm-charcoal panel, brass screws
// in the corners, levers arrayed left-to-right. Each lever is a
// click-to-pull mechanism; per-lever cohort tables / popup previews
// / pull results expand inline beneath the lever they belong to so
// they don't crowd the row above.

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
        <Link href="/feather" className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
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
          updates as teammates complete the action.
        </p>
      </header>

      {/* Console — dark warm-charcoal plate with brass corner screws.
          Horizontal scroll on overflow so a future expansion to many
          levers stays usable on a phone. */}
      <div
        className="relative rounded-3xl p-6 sm:p-8 lg:p-10 overflow-hidden"
        style={{
          background:
            'linear-gradient(180deg, #2a1812 0%, #1c100b 55%, #14090a 100%)',
          boxShadow:
            'inset 0 2px 12px rgba(0,0,0,0.55), 0 16px 38px -18px rgba(0,0,0,0.65)',
        }}
      >
        {/* Brass screws in the four corners — purely decorative
            but they sell the "physical control panel" idea
            instantly. */}
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

        {/* Console label strip across the top of the plate. */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/70">
            Control console
          </p>
          <p className="text-[10px] font-mono text-white/35">
            Authorized: {user.email}
          </p>
        </div>

        {/* Lever row. Horizontal scroll only kicks in when there are
            more levers than fit; today there's one, so the scroll
            bar stays hidden. */}
        <div className="relative">
          <div
            className="flex flex-row items-start gap-6 sm:gap-10 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            <JdReminderLever />
            {/* Future levers slot in here — same shape: a Lever
                visual + per-lever data wiring. */}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-foreground/45 text-center">
        Every pull writes to the activity feed with the recipient list and
        attribution. Recipients can dismiss the popup, but it returns next
        load until the underlying action is complete.
      </p>
    </div>
  );
}
