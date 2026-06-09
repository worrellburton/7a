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
  suppressAuthor = false,
  suppressReviewer = false,
}: {
  episode: Episode;
  author?: BlogAuthor;
  reviewer?: BlogAuthor;
  // When true, omit the author / reviewer Person node from the
  // emitted JSON-LD. The editor's "None" sentinel (NONE_SLUG) sets
  // these so YMYL posts can opt out of credentialing when an
  // unsigned editorial line is required.
  suppressAuthor?: boolean;
  suppressReviewer?: boolean;
}) {
  const author = suppressAuthor ? null : (authorOverride ?? resolveAuthor(episode.authorSlug));
  const reviewer = suppressReviewer ? null : (reviewerOverride ?? resolveReviewer(episode.reviewerSlug));
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
  if (author) payload.author = personNode(author);
  if (reviewer) payload.reviewedBy = personNode(reviewer);
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
  suppressAuthor = false,
  suppressReviewer = false,
  authorIsHorse = false,
}: {
  episode: Episode;
  author?: BlogAuthor;
  reviewer?: BlogAuthor;
  className?: string;
  // When true, hide the "Written by" / "Medically reviewed by" line.
  // Editor's NONE_SLUG sentinel flips these for posts that should
  // ship without bylines (rare; YMYL content normally needs them).
  suppressAuthor?: boolean;
  suppressReviewer?: boolean;
  // When the author is a therapy horse, drop the /meet-our-team link
  // (no profile page exists) and skip the credentials suffix.
  authorIsHorse?: boolean;
}) {
  const author = suppressAuthor ? null : (authorOverride ?? resolveAuthor(episode.authorSlug));
  const reviewer = suppressReviewer ? null : (reviewerOverride ?? resolveReviewer(episode.reviewerSlug));
  const authorHref = author && !authorIsHorse ? `/who-we-are/meet-our-team/${author.slug}` : '#';
  const reviewerHref = reviewer ? `/who-we-are/meet-our-team/${reviewer.slug}` : '#';
  const lastReviewed = episode.lastReviewedAt ?? episode.publishedAt;
  // Nothing to render if both rails are suppressed.
  if (!author && !reviewer) return null;

  return (
    <div
      className={`mb-8 pb-6 border-b border-black/10 ${className}`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {author && (
      <div className="flex flex-wrap items-center gap-3">
        {(() => {
          const initials = author.name
            .split(/\s+/)
            .map((p) => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
          const ringHover = authorIsHorse ? '' : 'hover:ring-primary/40';
          const avatarInner = author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.avatarUrl}
              alt={author.name}
              referrerPolicy="no-referrer"
              width={44}
              height={44}
              loading="eager"
              decoding="async"
              className="w-11 h-11 object-cover block"
            />
          ) : (
            <span className="w-11 h-11 inline-flex items-center justify-center bg-warm-bg text-primary text-sm font-bold">
              {initials}
            </span>
          );
          return authorIsHorse ? (
            <span
              className={`shrink-0 rounded-full overflow-hidden ring-1 ring-black/10 ${ringHover}`}
              aria-label={author.name}
            >
              {avatarInner}
            </span>
          ) : (
            <Link
              href={authorHref}
              className={`shrink-0 rounded-full overflow-hidden ring-1 ring-black/10 ${ringHover}`}
              aria-label={`More about ${author.name}`}
            >
              {avatarInner}
            </Link>
          );
        })()}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-foreground/45">
            Written by
          </p>
          <p className="text-sm text-foreground">
            {authorIsHorse ? (
              <span className="font-semibold text-foreground">{author.name}</span>
            ) : (
              <Link
                href={authorHref}
                className="font-semibold text-foreground hover:text-primary"
              >
                {author.name}
                {author.credentials && (
                  <span className="text-foreground/55 font-normal">, {author.credentials}</span>
                )}
              </Link>
            )}
            <span className="text-foreground/55"> · {author.title}</span>
          </p>
          <p className="text-[12px] text-foreground/50">
            <time dateTime={episode.publishedAt}>{episode.publishedDisplay}</time>
          </p>
        </div>
      </div>
      )}

      {reviewer && (
      /* Medically-reviewed line. Drives the
         schema.org/MedicalWebPage.reviewedBy field too, so SEO and
         GEO (AI-search citation) get the credentialed-reviewer
         signal that YMYL content needs to rank. */
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
      )}
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
