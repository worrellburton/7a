// Per-episode author byline + MedicalWebPage JSON-LD.
//
// Goal: every Recovery Roadmap episode gets a visible byline that
// reads "Written by <author> · Medically reviewed by <reviewer>",
// and a matching schema.org/MedicalWebPage structured-data block
// Google + AI search engines can read for E-E-A-T (expertise,
// experience, authority, trust) signals.
//
// Drop-in usage from any episode page:
//
//   <BlogPostJsonLd episode={EPISODES.find(e => e.slug === 'foo')!} />
//   <AuthorByline episode={...} />
//
// Both look up the author + reviewer by slug from BLOG_AUTHORS so
// the rendered byline and the JSON-LD agree on the same Person URL.
// Missing slugs fall back to DEFAULT_AUTHOR_SLUG / DEFAULT_REVIEWER_SLUG
// so legacy posts still emit a valid Person + reviewedBy pair —
// AI search engines specifically demote sources that ship medical
// content without a credentialed reviewer.

import Link from 'next/link';
import Image from 'next/image';
import { type Episode } from '@/lib/episodes';
import {
  authorProfileUrl,
  resolveAuthor,
  resolveReviewer,
  type BlogAuthor,
} from '@/lib/blogAuthors';

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

/* ── Person node ────────────────────────────────────────────────── */

function personNode(person: BlogAuthor): Record<string, unknown> {
  const url = authorProfileUrl(person.slug, SITE_ORIGIN);
  const displayName = person.credentials ? `${person.name}, ${person.credentials}` : person.name;
  const node: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${url}#person`,
    name: displayName,
    url,
    jobTitle: person.title,
    worksFor: { '@id': ORG_ID },
  };
  if (person.bio) node.description = person.bio;
  if (person.avatarUrl) node.image = absoluteUrl(person.avatarUrl);
  if (person.sameAs && person.sameAs.length > 0) node.sameAs = person.sameAs;
  return node;
}

/* ── JSON-LD ─────────────────────────────────────────────────────── */

// Server-rendered schema.org/MedicalWebPage block. Drop into the
// episode's page.tsx (server component) so the structured data
// lands in the initial HTML, where Google + AI search engines
// extract author + reviewer credentials at crawl time.
//
// The optional `author` / `reviewer` props let async server pages
// pre-resolve from the DB (resolveAuthorAsync / resolveReviewerAsync
// in /lib/blogAuthors) so an HR-edited user row beats the
// BLOG_AUTHORS seed. When omitted the sync resolvers run against
// the committed seed.
export function BlogPostJsonLd({
  episode,
  author: authorOverride,
  reviewer: reviewerOverride,
}: { episode: Episode; author?: BlogAuthor; reviewer?: BlogAuthor }) {
  const author = authorOverride ?? resolveAuthor(episode.authorSlug);
  const reviewer = reviewerOverride ?? resolveReviewer(episode.reviewerSlug);
  const url = postUrl(episode);
  const lastReviewed = (episode.lastReviewedAt ?? episode.publishedAt).slice(0, 10);

  // Recovery Roadmap series link (same as before — keeps Google's
  // series-aware rich results stitching the posts together).
  const inRoadmap = !episode.href;

  const payload: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    headline: episode.title,
    description: episode.blurb,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: absoluteUrl(episode.image),
    datePublished: episode.publishedAt,
    dateModified: episode.publishedAt,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-US',
    author: personNode(author),
    reviewedBy: personNode(reviewer),
    lastReviewed,
    // Targeting patients + their families rather than a clinical
    // audience. Schema.org enum value MedicalAudienceType has
    // 'Patient' as one of the canonical choices.
    medicalAudience: 'Patient',
    // Addiction medicine is the closest enum match for the site's
    // editorial focus; Google + AI search engines map both
    // 'AddictionMedicine' (Schema.org MedicalSpecialty) and the
    // textual variant to the same topic cluster.
    specialty: 'AddictionMedicine',
  };
  if (inRoadmap) {
    payload.isPartOf = {
      '@type': 'CreativeWorkSeries',
      name: 'The Recovery Roadmap',
      url: `${SITE_ORIGIN}/who-we-are/recovery-roadmap`,
    };
    payload.articleSection = 'Recovery Roadmap';
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

/* ── Byline ──────────────────────────────────────────────────────── */

// Visible byline shown above the article body. Renders an
// avatar + author block, then a "Medically reviewed by" line so
// every reader (not just crawlers) sees the credentials of who
// validated the content. Both author and reviewer fall back to
// the defaults so even legacy posts ship a real byline.
export function AuthorByline({
  episode,
  author: authorOverride,
  reviewer: reviewerOverride,
  className = '',
}: {
  episode: Episode;
  author?: BlogAuthor;
  reviewer?: BlogAuthor;
  className?: string;
}) {
  const author = authorOverride ?? resolveAuthor(episode.authorSlug);
  const reviewer = reviewerOverride ?? resolveReviewer(episode.reviewerSlug);
  const authorHref = `/who-we-are/meet-our-team/${author.slug}`;
  const reviewerHref = `/who-we-are/meet-our-team/${reviewer.slug}`;
  const lastReviewed = episode.lastReviewedAt ?? episode.publishedAt;

  return (
    <div
      className={`mb-8 pb-6 border-b border-black/10 ${className}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {author.avatarUrl ? (
          <Link
            href={authorHref}
            className="shrink-0 rounded-full overflow-hidden ring-1 ring-black/10 hover:ring-primary/40"
            aria-label={`More about ${author.name}`}
          >
            <Image
              src={author.avatarUrl}
              alt={author.name}
              width={44}
              height={44}
              className="w-11 h-11 object-cover"
            />
          </Link>
        ) : (
          <Link
            href={authorHref}
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
              href={authorHref}
              className="font-semibold text-foreground hover:text-primary"
            >
              {author.name}
              {author.credentials && (
                <span className="text-foreground/55 font-normal">, {author.credentials}</span>
              )}
            </Link>
            <span className="text-foreground/55"> · {author.title}</span>
          </p>
          <p className="text-[12px] text-foreground/50">
            <time dateTime={episode.publishedAt}>{episode.publishedDisplay}</time>
          </p>
        </div>
      </div>

      {/* Medically-reviewed line. Always present — drives the
          schema.org/MedicalWebPage.reviewedBy field too, so SEO and
          GEO (AI-search citation) get the credentialed-reviewer
          signal that YMYL content needs to rank. */}
      <p className="mt-3 text-[12.5px] text-foreground/65">
        <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-foreground/45">Medically reviewed by</span>
        <span className="text-foreground/45"> · </span>
        <Link
          href={reviewerHref}
          className="font-semibold text-foreground hover:text-primary"
        >
          {reviewer.name}
          {reviewer.credentials && (
            <span className="text-foreground/55 font-normal">, {reviewer.credentials}</span>
          )}
        </Link>
        <span className="text-foreground/55"> · {reviewer.title}</span>
        <span className="text-foreground/45"> · last reviewed </span>
        <time dateTime={lastReviewed} className="text-foreground/65">
          {new Date(lastReviewed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </time>
      </p>
    </div>
  );
}

// Re-export the resolvers in case a page needs to render the author
// or reviewer in a non-standard place.
export function authorForEpisode(episode: Episode): BlogAuthor {
  return resolveAuthor(episode.authorSlug);
}

export function reviewerForEpisode(episode: Episode): BlogAuthor {
  return resolveReviewer(episode.reviewerSlug);
}
