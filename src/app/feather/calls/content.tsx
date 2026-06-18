'use client';

// Aircall — the live cloud-phone surface. This is the new home of
// /feather/calls (the legacy CallTrackingMetrics dashboard moved to
// /feather/ctm). Built out in phases:
//   1. Operator schedule header (who's on phones now + up next), read
//      from calendar_events (category='phones').
//   2. Live call log backed by the aircall_calls table + Supabase
//      Realtime, with recordings + AI transcripts.
//   3. Embedded Aircall Everywhere widget (ring + click-to-call).
// This placeholder keeps the route resolvable while those land.

export default function CallsContent() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="relative rounded-3xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] mb-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/90 to-transparent" />
        <div className="px-5 sm:px-7 py-5 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Calls
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Live Aircall phone surface — coming together. The legacy
            CallTrackingMetrics dashboard now lives under{' '}
            <a href="/feather/ctm" className="text-primary hover:underline font-semibold">CTM</a>.
          </p>
        </div>
      </header>
    </div>
  );
}
