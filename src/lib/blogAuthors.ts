// Blog post authorship — the byline + Google E-E-A-T + GEO
// MedicalWebPage schema all pull from this module.
//
// Each author maps to a team member on /who-we-are/meet-our-team
// via their `public_slug` (same value `users.public_slug` carries
// in Supabase). The byline links out to the team detail page, and
// the structured-data block references the same URL as the Person
// @id so search engines (and AI search engines) can connect
// post → person → company.
//
// Authors who can also serve as medical reviewers carry
// `isMedicalReviewer: true`. That subset is what the per-post
// "Medically reviewed by" dropdown surfaces and what
// MedicalWebPage.reviewedBy gets populated from — only credentialed
// clinicians should appear there.

export interface BlogAuthor {
  /** Matches users.public_slug — also the team-page URL slug. */
  slug: string;
  /** Display name on byline. */
  name: string;
  /** Job title — surfaces under the byline ("Clinical Director"). */
  title: string;
  /** Letters/abbreviations after the name (LCSW, MD, MSW, etc). */
  credentials?: string;
  /** Optional one-line bio used in JSON-LD Person.description. */
  bio?: string;
  /** Optional avatar — used in JSON-LD Person.image when present. */
  avatarUrl?: string;
  /**
   * Eligible to appear in the "Medically reviewed by" dropdown +
   * MedicalWebPage.reviewedBy. Only credentialed clinicians
   * (LCSW, MD, DO, PhD, LISAC, LPC, LMFT, ...) should carry this
   * flag — AI search engines specifically extract the credential
   * token off the reviewer's name when deciding whether to cite a
   * medical/recovery post.
   */
  isMedicalReviewer?: boolean;
  /**
   * Off-site profiles (LinkedIn, license-board lookup, ResearchGate,
   * etc.). Schema.org `sameAs` — this is the #1 differentiator AI
   * search engines use when grading author authority. Empty array is
   * fine; null is treated the same.
   */
  sameAs?: string[];
}

const SITE_ORIGIN = 'https://sevenarrowsrecoveryarizona.com';

// Public profile URL for an author — single source of truth so
// the byline link and Article JSON-LD never drift.
export function authorProfileUrl(slug: string, origin = SITE_ORIGIN): string {
  return `${origin}/who-we-are/meet-our-team/${slug}`;
}

// Curated list of staff who write for or review the Recovery
// Roadmap. New authors go here; the /app/content editor surfaces
// the same list in its author + reviewer dropdowns.
export const BLOG_AUTHORS: BlogAuthor[] = [
  {
    slug: 'lindsay-rothschild',
    name: 'Lindsay Rothschild',
    title: 'Clinical Director',
    credentials: 'LCSW',
    bio: 'Clinical Director at Seven Arrows Recovery. Lindsay leads the clinical team in Elfrida, Arizona, and writes about trauma-informed addiction treatment.',
    isMedicalReviewer: true,
  },
  {
    slug: 'sakina-mayan',
    name: 'Sakina Mayan',
    title: 'Clinical Counselor',
    bio: 'Clinical counselor at Seven Arrows Recovery focused on co-occurring disorders and family-systems work in residential treatment.',
  },
];

export function findAuthorBySlug(slug: string | null | undefined): BlogAuthor | null {
  if (!slug) return null;
  return BLOG_AUTHORS.find((a) => a.slug === slug) ?? null;
}

// Filtered registry — every clinician eligible to sit in the
// "Medically reviewed by" slot. Sort matches BLOG_AUTHORS order so
// the dropdown is stable.
export const BLOG_REVIEWERS: BlogAuthor[] = BLOG_AUTHORS.filter((a) => a.isMedicalReviewer === true);

export function findReviewerBySlug(slug: string | null | undefined): BlogAuthor | null {
  const author = findAuthorBySlug(slug);
  if (!author) return null;
  return author.isMedicalReviewer ? author : null;
}

// Defaults used when an episode (static or DB-backed) hasn't set a
// per-post author / reviewer yet. Every YMYL post still emits a
// real reviewedBy so we don't regress E-E-A-T scoring on older
// posts that landed before the dropdown shipped.
export const DEFAULT_AUTHOR_SLUG = 'lindsay-rothschild';
export const DEFAULT_REVIEWER_SLUG = 'lindsay-rothschild';

// Resolver helpers that fall back to the defaults — call these
// from render-time code so a missing `authorSlug` / `reviewerSlug`
// still produces a valid Person node.
export function resolveAuthor(slug: string | null | undefined): BlogAuthor {
  return findAuthorBySlug(slug) ?? (findAuthorBySlug(DEFAULT_AUTHOR_SLUG) ?? BLOG_AUTHORS[0]);
}

export function resolveReviewer(slug: string | null | undefined): BlogAuthor {
  const explicit = findReviewerBySlug(slug);
  if (explicit) return explicit;
  const def = findReviewerBySlug(DEFAULT_REVIEWER_SLUG);
  return def ?? BLOG_REVIEWERS[0] ?? BLOG_AUTHORS[0];
}
