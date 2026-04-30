'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import JdReminderLever from './JdReminderLever';

// Super-admin-only "levers" — broadcast tools that push a full-screen
// popup to a defined set of users in real time. Each lever has its
// own card with: a description of what it does, a preview of what
// the recipient will see, the live count of who'd be notified right
// now, and a "Pull" button that fires the broadcast.
//
// Gating: the page is registered as adminOnly in PagePermissions, but
// only super admins can pull. PageGuard handles the route-level gate;
// inside, useAuth().isSuperAdmin gates the actions.

export default function LeversContent() {
  const { user, isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return (
      <div className="px-6 py-10 text-sm text-foreground/60">Sign in required.</div>
    );
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
        <Link
          href="/app"
          className="mt-4 inline-block text-xs font-semibold text-primary hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary mb-2">
          Super-admin tools
        </p>
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Levers
        </h1>
        <p className="mt-2 text-sm text-foreground/65 max-w-2xl">
          Broadcast tools that push a full-screen popup to a defined set of
          teammates. Pull one to nudge everyone in the matching cohort right
          now — no email, no waiting, the popup appears in their browser.
        </p>
      </header>

      <div className="space-y-6">
        <JdReminderLever />
      </div>
    </div>
  );
}
