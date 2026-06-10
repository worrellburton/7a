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
// Roadmap. New authors go here; the /feather/content editor surfaces
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

// Sentinel stored in blogs.author_slug / blogs.reviewer_slug when
// the editor explicitly selected "None" in the Byline picker. The
// live page reads it as "skip this byline entirely" — distinct from
// null (which still falls back to the seeded default).
export const NONE_SLUG = '__none__';
export function isNoneSlug(slug: string | null | undefined): boolean {
  return slug === NONE_SLUG;
}

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

// Server-side async resolver — prefers a users row (HR-editable
// at /feather/team) and falls back to the BLOG_AUTHORS seed when the
// slug isn't in the DB. Used by the public blog renderers so a
// freshly-promoted author (is_blog_author flipped on in the team
// page) ships on the next page render without a code deploy.
//
// Lazy-imports the server Supabase client so this module stays
// importable from client bundles — only the static portion of the
// module is reached from 'use client' files.
export async function resolveAuthorAsync(slug: string | null | undefined): Promise<BlogAuthor> {
  // Start with the synchronous seed answer so we have a name to
  // fall back to when the DB lookup-by-slug misses. Lindsay's row,
  // for example, has public_slug=NULL today, so the slug lookup
  // returns nothing and the previous version returned a seed
  // without an avatar. The two-pass below fixes that: try the
  // slug first, then try the full_name from the seed entry,
  // accepting whichever row resolves.
  const seed = resolveAuthor(slug);
  try {
    const { getAdminSupabase } = await import('@/lib/supabase-server');
    const admin = getAdminSupabase();
    const select = 'public_slug, full_name, job_title, credentials, bio, avatar_url, linkedin_url, is_blog_author, is_medical_reviewer';
    // Pass 1 — match on public_slug. Works for any teammate whose
    // public_slug is populated.
    let data: Record<string, unknown> | null = null;
    if (slug) {
      const r = await admin.from('users').select(select).eq('public_slug', slug).maybeSingle();
      data = (r.data as Record<string, unknown> | null) ?? null;
    }
    // Pass 2 — fall back to a case-insensitive full_name match.
    // Catches teammates whose public_slug isn't set on the users
    // row (HR data entry can lag the BLOG_AUTHORS seed by weeks).
    if (!data && seed.name) {
      const r = await admin.from('users').select(select).ilike('full_name', seed.name).maybeSingle();
      data = (r.data as Record<string, unknown> | null) ?? null;
    }
    if (data && data.full_name) {
      return {
        slug: (data.public_slug as string | null) ?? seed.slug,
        name: data.full_name as string,
        title: (data.job_title as string | null) ?? seed.title,
        credentials: (data.credentials as string | null) ?? seed.credentials,
        bio: (data.bio as string | null) ?? seed.bio,
        avatarUrl: (data.avatar_url as string | null) ?? seed.avatarUrl,
        sameAs: data.linkedin_url ? [data.linkedin_url as string] : seed.sameAs,
        isMedicalReviewer: (data.is_medical_reviewer as boolean | null) === true || seed.isMedicalReviewer === true,
      };
    }
  } catch {
    // DB unreachable — fall through to the synchronous seed.
  }
  return seed;
}

export async function resolveReviewerAsync(slug: string | null | undefined): Promise<BlogAuthor> {
  if (slug) {
    const author = await resolveAuthorAsync(slug);
    if (author.isMedicalReviewer) return author;
  }
  // Fall back to the default reviewer (Lindsay) via the DB path so
  // the seeded credentials / linkedin_url take precedence over the
  // committed seed values.
  return resolveAuthorAsync(DEFAULT_REVIEWER_SLUG);
}
