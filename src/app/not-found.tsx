import type { Metadata } from 'next';
import Link from 'next/link';

// Custom 404 — global fallback when no route matches. Themed to the
// rest of the marketing site: warm-bg gradient, Fraunces display
// headline with a copper accent, friendly recovery-tone copy, plus
// two CTAs (back home + call admissions) so a lost visitor never
// dead-ends.

export const metadata: Metadata = {
  title: 'Page not found | Seven Arrows Recovery',
  description:
    'We couldn’t find the page you were looking for. Head back to the home page or call (866) 718-1665.',
  robots: 'noindex, follow',
};

export default function NotFound() {
  return (
    <main className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-warm-bg via-warm-bg to-[#e9dccb]">
      {/* Quiet horizon photo behind the card — kept faint so the
          copy reads as the focus, not the imagery. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-cover bg-center opacity-20"
        style={{ backgroundImage: 'url(/images/facility-exterior-mountains.jpg)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-warm-bg via-warm-bg/40 to-transparent"
      />

      <section
        className="relative z-10 w-full max-w-2xl mx-auto px-6 py-16 text-center"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* 7A mark — same medallion the home orbit uses, so the
            error page still feels of-a-piece with /app. */}
        <div
          aria-hidden="true"
          className="mx-auto mb-8 w-16 h-16 rounded-full bg-white/85 border border-white shadow-[0_10px_30px_-12px_rgba(60,48,42,0.35)] flex items-center justify-center"
        >
          <span
            className="text-[12px] font-bold uppercase tracking-[0.22em] text-primary"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            7A
          </span>
        </div>

        <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-foreground/45">
          Seven Arrows Recovery
        </p>
        <h1
          className="mt-2 text-7xl sm:text-8xl font-bold text-foreground tabular-nums leading-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          4<em className="not-italic text-primary">0</em>4
        </h1>
        <h2
          className="mt-6 text-2xl sm:text-3xl font-bold text-foreground leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          This trail doesn&apos;t go anywhere we can find.
        </h2>
        <p className="mt-4 max-w-md mx-auto text-[14.5px] text-foreground/65 leading-relaxed">
          The page you were looking for may have moved, been renamed, or never
          existed. If a real human can help, we&apos;re a phone call away.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-primary text-white px-6 py-3 text-[12px] font-bold uppercase tracking-[0.18em] hover:bg-primary/90 shadow-[0_12px_28px_-14px_rgba(184,115,51,0.6)] transition-colors"
          >
            ← Back to home
          </Link>
          <a
            href="tel:+18667181665"
            className="inline-flex items-center justify-center rounded-full border border-foreground/15 bg-white/85 backdrop-blur-sm px-6 py-3 text-[12px] font-bold uppercase tracking-[0.18em] text-foreground hover:border-primary/45 hover:text-primary transition-colors"
          >
            Call (866) 718-1665
          </a>
        </div>

        {/* Quiet wayfinding row — the most-visited destinations a
            lost visitor probably meant to reach. */}
        <nav
          aria-label="Helpful links"
          className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px]"
        >
          <Link href="/admissions" className="text-foreground/55 hover:text-primary transition-colors">
            Admissions
          </Link>
          <span aria-hidden className="text-foreground/20">·</span>
          <Link href="/our-program" className="text-foreground/55 hover:text-primary transition-colors">
            Our program
          </Link>
          <span aria-hidden className="text-foreground/20">·</span>
          <Link href="/who-we-are/recovery-roadmap" className="text-foreground/55 hover:text-primary transition-colors">
            Recovery roadmap
          </Link>
          <span aria-hidden className="text-foreground/20">·</span>
          <Link href="/contact" className="text-foreground/55 hover:text-primary transition-colors">
            Contact
          </Link>
        </nav>
      </section>
    </main>
  );
}
