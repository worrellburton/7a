'use client';

import { useAuth } from '@/lib/AuthProvider';

// Phase 15/20 — page scaffold only. List view, edit drawer, toggles,
// and reorder land in phases 16-19. Auth gate matches the team page
// pattern: useAuth → return null if not admin (PlatformShell will
// have already redirected non-admins via PageGuard, but the inline
// check makes the intent explicit and prevents a flash of content).

export default function ReviewsContent() {
  const { user, isAdmin } = useAuth();
  if (!user || !isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Reviews
        </h1>
        <p className="mt-1 text-sm text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>
          Curate the alumni and Google reviews shown across the marketing site.
        </p>
      </header>

      <div className="rounded-xl border border-black/10 bg-white p-8 text-center text-foreground/50">
        <p className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>
          List view, edit drawer, hide/feature toggles, and drag-to-reorder
          arrive in phases 16-19. CRUD API is already live at{' '}
          <code className="text-foreground/70">/api/reviews</code>.
        </p>
      </div>
    </div>
  );
}
