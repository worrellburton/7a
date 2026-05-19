// Per-episode author byline + Article JSON-LD.
//
// Goal: every Recovery Roadmap episode gets a visible "By <name>,
// <title>" byline that links to the author's team-page profile,
// and a matching schema.org/Article structured-data block that
// Google can read for E-E-A-T (expertise, experience, authority,
// trust) signals.
//
// Drop-in usage from any episode page:
//
//   <BlogPostJsonLd episode={EPISODES.find(e => e.slug === 'foo')!} />
//   <AuthorByline episode={...} />
//
// Both look up the author by slug from the BLOG_AUTHORS registry so
// the rendered byline + the JSON-LD agree on the same Person URL.

import Link from 'next/link';
import Image from 'next/image';
import { type Episode } from '@/lib/episodes';
import { authorProfileUrl, findAuthorBySlug, type BlogAuthor } from '@/lib/blogAuthors';

const SITE_ORIGIN = 'https://sevenarrowsrecoveryarizona.com';
const ORG_ID = `${SITE_ORIGIN}/#organization`;

function absoluteUrl(maybeRelative: string): string {
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  if (maybeRelative.startsWith('/')) return `${SITE_ORIGIN}${maybeRelative}`;
  return `${SITE_ORIGIN}/${maybeRelative}`;
}

function postUrl(episode: Episode): string {
  if (episode.href) return absoluteUrl(episode.href);
  return `${SITE_ORIGIN}/who-we-are/blog/${episode.slug}`;
}

/* ── JSON-LD ─────────────────────────────────────────────────────── */

// Server-rendered schema.org/Article block. Drop into the
// episode's page.tsx (server component) so the structured data
// lands in the initial HTML, where Google reads it.
export function BlogPostJsonLd({ episode }: { episode: Episode }) {
  const author = findAuthorBySlug(episode.authorSlug);
  const url = postUrl(episode);
  const authorUrl = author ? authorProfileUrl(author.slug, SITE_ORIGIN) : null;

  const personNode = author
    ? {
        '@type': 'Person',
        '@id': `${authorUrl}#person`,
        name: author.name + (author.credentials ? `, ${author.credentials}` : ''),
        url: authorUrl,
        jobTitle: author.title,
        ...(author.bio ? { description: author.bio } : {}),
        ...(author.avatarUrl ? { image: absoluteUrl(author.avatarUrl) } : {}),
        worksFor: { '@id': ORG_ID },
      }
    : null;

  // Episodes that live under /who-we-are/blog/ are part of the
  // Recovery Roadmap series — link them via a CreativeWorkSeries
  // node so Google's series-aware rich results can stitch them
  // together. Legacy posts at root-level URLs (episode.href set
  // to an absolute slug) skip the series link.
  const inRoadmap = !episode.href;

  const article: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: episode.title,
    description: episode.blurb,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: absoluteUrl(episode.image),
    datePublished: episode.publishedAt,
    dateModified: episode.publishedAt,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-US',
  };
  if (personNode) {
    article.author = personNode;
  }
  if (inRoadmap) {
    article.isPartOf = {
      '@type': 'CreativeWorkSeries',
      name: 'The Recovery Roadmap',
      url: `${SITE_ORIGIN}/who-we-are/recovery-roadmap`,
    };
    article.articleSection = 'Recovery Roadmap';
  }

  return (
    <script
      type="application/ld+json"
      // Episodes are static-rendered — dangerouslySetInnerHTML is
      // the standard pattern Next docs recommend for JSON-LD so
      // the script body isn't escaped into a string literal.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
    />
  );
}

/* ── Byline ──────────────────────────────────────────────────────── */

// Visible byline shown above the article body. Renders nothing
// when an episode has no attributed author — keeps legacy posts
// from showing an awkward empty row.
export function AuthorByline({
  episode,
  className = '',
}: {
  episode: Episode;
  className?: string;
}) {
  const author = findAuthorBySlug(episode.authorSlug);
  if (!author) return null;
  const profileHref = `/who-we-are/meet-our-team/${author.slug}`;
  return (
    <div
      className={`flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-black/10 ${className}`}
      style={{ fontFamily: 'var(--font-body)' }}
      // Microdata fallback — duplicates the JSON-LD author so
      // crawlers reading either format get the same answer.
      itemScope
      itemType="https://schema.org/Person"
    >
      {author.avatarUrl ? (
        <Link
          href={profileHref}
          className="shrink-0 rounded-full overflow-hidden ring-1 ring-black/10 hover:ring-primary/40"
          aria-label={`More about ${author.name}`}
        >
          <Image
            src={author.avatarUrl}
            alt={author.name}
            width={44}
            height={44}
            className="w-11 h-11 object-cover"
            itemProp="image"
          />
        </Link>
      ) : (
        <Link
          href={profileHref}
          aria-label={`More about ${author.name}`}
          className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-warm-bg text-primary text-sm font-bold ring-1 ring-black/10 hover:ring-primary/40"
        >
          {author.name
            .split(/\s+/)
            .map((p) => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </Link>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-foreground/45">
          Written by
        </p>
        <p className="text-sm text-foreground">
          <Link
            href={profileHref}
            className="font-semibold text-foreground hover:text-primary"
            itemProp="url"
          >
            <span itemProp="name">{author.name}</span>
            {author.credentials && (
              <span className="text-foreground/55 font-normal">, {author.credentials}</span>
            )}
          </Link>
          <span className="text-foreground/55"> · <span itemProp="jobTitle">{author.title}</span></span>
        </p>
        <p className="text-[12px] text-foreground/50">
          <time dateTime={episode.publishedAt}>{episode.publishedDisplay}</time>
        </p>
      </div>
    </div>
  );
}

// Re-export the resolver in case a page needs to render the author
// in a non-standard place (e.g. a featured "About the author" card
// at the bottom of the post).
export function authorForEpisode(episode: Episode): BlogAuthor | null {
  return findAuthorBySlug(episode.authorSlug);
}
