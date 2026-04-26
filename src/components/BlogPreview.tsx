import Link from 'next/link';
import { EPISODES_NEWEST_FIRST, episodeHref } from '@/lib/episodes';

// Landing-page surfacing of the Recovery Roadmap series. Reads the
// latest 3 episodes from the shared episode manifest so adding a
// new entry to src/lib/episodes.ts auto-pushes it onto the homepage.

export default function BlogPreview() {
  const latest = EPISODES_NEWEST_FIRST.slice(0, 3);

  return (
    <section className="py-16 lg:py-20 bg-white" aria-labelledby="blog-preview-heading">
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
            href="/who-we-are/recovery-roadmap"
            className="hidden sm:inline-flex text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            View Full Series &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latest.map((ep) => (
            <Link
              key={ep.slug}
              href={episodeHref(ep.slug)}
              className="bg-white rounded-xl overflow-hidden shadow-sm group block no-underline transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_8px_30px_rgba(160,82,45,0.2)]"
            >
              <div className="relative">
                <img
                  src={ep.image}
                  alt={ep.imageAlt}
                  className="h-48 w-full object-cover"
                  loading="lazy"
                />
                <div
                  className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Episode {ep.number}
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
                    {ep.publishedDisplay}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                  {ep.title}
                </h3>
                <p
                  className="text-foreground/60 text-sm leading-relaxed line-clamp-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {ep.blurb}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="sm:hidden text-center mt-6">
          <Link
            href="/who-we-are/recovery-roadmap"
            className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            View Full Series &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
