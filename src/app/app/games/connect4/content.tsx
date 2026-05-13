'use client';

// Connect-4 tournament — Phase 1 page scaffold. Subsequent phases
// fold in: match API + records, board UI, realtime sync, lobby /
// matchmaking, bracket model + rendering, leaderboard, polish.

export default function Content() {
  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <header className="mb-6">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">Games</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Connect-4 Tournament
        </h1>
        <p className="mt-1 text-sm text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
          Head-to-head matches across the team, with a single-elimination bracket on demand.
        </p>
      </header>

      <section className="rounded-2xl border border-dashed border-black/15 bg-white/50 px-6 py-10 text-center">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-foreground/45">
          Coming soon
        </p>
        <p className="mt-2 text-[13px] text-foreground/55 max-w-md mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
          The board and lobby ship in Phase 3 of this 10-phase build. Phases 1-2 land the
          schema and API so a match record can already be created.
        </p>
      </section>
    </div>
  );
}
