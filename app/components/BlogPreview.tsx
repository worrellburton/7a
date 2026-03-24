import { Link } from '@remix-run/react';

export default function BlogPreview() {
  return (
    <section className="py-16 lg:py-20 bg-warm-bg" aria-labelledby="blog-preview-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="section-label mb-3">Investigative Series</p>
            <h2
              id="blog-preview-heading"
              className="text-2xl lg:text-3xl font-bold text-foreground"
            >
              The Recovery Roadmap
            </h2>
          </div>
          <Link
            to="/who-we-are/blog"
            className="hidden sm:inline-flex text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            View Full Series &rarr;
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Episode 1 — Published */}
          <Link
            to="/who-we-are/blog/when-drinking-stops-working"
            className="bg-white rounded-xl overflow-hidden shadow-sm group block no-underline transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_8px_30px_rgba(160,82,45,0.2)]"
          >
            <div className="relative">
              <img src="/7a/images/resident-reading-window.jpg" alt="When Drinking Stops Working" className="h-48 w-full object-cover" loading="lazy" />
              <div className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ fontFamily: 'var(--font-body)' }}>
                Episode 1
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-primary text-[10px] font-semibold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Recovery Roadmap
                </span>
                <span className="text-foreground/30 text-[10px]" style={{ fontFamily: 'var(--font-body)' }}>
                  March 24, 2026
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                When Drinking Stops Working: Recognizing the Signs of Addiction
              </h3>
              <p
                className="text-foreground/60 text-sm leading-relaxed line-clamp-2"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                A compassionate guide to understanding when substance use has crossed from choice to compulsion.
              </p>
            </div>
          </Link>

          {/* Episode 2 — Coming Soon (Glowing) */}
          <div
            className="relative rounded-xl overflow-hidden shadow-sm block transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_8px_30px_rgba(160,82,45,0.2)] cursor-default"
            style={{
              background: 'linear-gradient(135deg, rgba(160,82,45,0.08), rgba(160,82,45,0.03))',
            }}
          >
            {/* Glowing border animation */}
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(var(--color-warm-bg, #f5f0eb), var(--color-warm-bg, #f5f0eb)), linear-gradient(135deg, #a0522d, #c67a4a, #a0522d)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                animation: 'glowPulse 2.5s ease-in-out infinite',
              }}
            />
            <div className="relative h-48 w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <div className="text-center">
                <div
                  className="inline-block text-primary text-xs font-bold uppercase tracking-widest mb-2 px-4 py-1.5 rounded-full border border-primary/30"
                  style={{
                    fontFamily: 'var(--font-body)',
                    animation: 'glowPulse 2.5s ease-in-out infinite',
                    boxShadow: '0 0 20px rgba(160,82,45,0.15)',
                  }}
                >
                  Coming Soon
                </div>
                <p className="text-foreground/40 text-sm" style={{ fontFamily: 'var(--font-body)' }}>Episode 2</p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-primary/50 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Recovery Roadmap
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground/40 mb-2 leading-snug">
                What Happens When You Walk Through the Door
              </h3>
              <p
                className="text-foreground/30 text-sm leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Your first week in treatment, demystified. A day-by-day guide for anyone afraid to make the call.
              </p>
            </div>
          </div>
        </div>

        <div className="sm:hidden text-center mt-6">
          <Link
            to="/who-we-are/blog"
            className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            View Full Series &rarr;
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; box-shadow: 0 0 15px rgba(160,82,45,0.1); }
          50% { opacity: 1; box-shadow: 0 0 30px rgba(160,82,45,0.25); }
        }
      `}</style>
    </section>
  );
}
