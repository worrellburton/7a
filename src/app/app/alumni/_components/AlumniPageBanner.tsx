// Banner that pins to the top of every page under /app/alumni/*.
// Reads to staff (specifically super admins, who can see these
// pages too) as "you're inside the alumni portal." Alumni users
// see the same banner and it grounds them in the section without
// being noisy. Pure CSS, no client state — drops anywhere.

export default function AlumniPageBanner() {
  return (
    <div
      className="bg-gradient-to-r from-primary/15 via-primary/10 to-warm-bg/40 border-b border-primary/20"
      aria-label="Alumni portal section"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2.5">
        <span className="inline-flex w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
        <p
          className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.28em] text-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Alumni page
        </p>
        <span className="text-[11px] text-foreground/55 ml-auto hidden sm:inline" style={{ fontFamily: 'var(--font-body)' }}>
          Visible to alumni · super admins can view to administer
        </span>
      </div>
    </div>
  );
}
