import Link from 'next/link';
import { relatedFor } from '@/lib/articleTopics';

// "Related Articles" module — 3-4 topically-related posts, rendered at
// the bottom of every root-level article (static and DB-backed alike).
// Relatedness comes from the tag map in lib/articleTopics.ts. Cards
// reuse the same bordered/hover treatment as the Recovery Roadmap
// series link that already closes each article, so the module reads as
// part of the existing template rather than a bolt-on.
//
// No hooks — safe to render from server components and from the
// 'use client' article content files.

export default function RelatedArticles({ slug }: { slug: string }) {
  const related = relatedFor(slug);
  if (related.length === 0) return null;
  return (
    <section className="pb-16 lg:pb-24 bg-white" aria-label="Related articles">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-10 border-t border-gray-100">
          <span
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Keep Reading
            <span className="w-5 h-px bg-primary/40" aria-hidden="true" />
          </span>
          <h2
            className="mt-2 mb-6 text-xl lg:text-2xl font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Related Articles
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((card) => (
              <Link
                key={card.slug}
                href={card.href}
                className="group flex items-stretch gap-4 p-4 rounded-xl border border-primary/25 hover:border-primary/55 hover:shadow-lg transition-all duration-300 bg-white"
              >
                <div className="shrink-0 w-24 sm:w-28 aspect-[4/3] rounded-lg overflow-hidden bg-warm-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image}
                    alt={card.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70 mb-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    The Recovery Roadmap
                  </span>
                  <p
                    className="text-foreground font-bold leading-snug group-hover:text-primary transition-colors text-[0.95rem] line-clamp-3"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {card.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
