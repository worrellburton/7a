// Blog post authorship — the byline + Google E-E-A-T author Person
// schema both pull from this module.
//
// Each author maps to a team member on /who-we-are/meet-our-team
// via their `public_slug` (same value `users.public_slug` carries
// in Supabase). The byline links out to the team detail page,
// and the Article JSON-LD references the same URL as the Person
// @id so search engines can connect post → person → company.
//
// New authors get added here. The /app/seo blog-creation tool
// surfaces the same list so admins can pick from the dropdown
// when generating a new post's prompt.

export interface BlogAuthor {
  /** Matches users.public_slug — also the team-page URL slug. */
  slug: string;
  /** Display name on byline, JSON-LD Person.name. */
  name: string;
  /** Job title — surfaces under the byline ("Clinical Director"). */
  title: string;
  /** Letters/abbreviations after the name (LCSW, MD, MSW, etc). */
  credentials?: string;
  /** Optional one-line bio used in JSON-LD Person.description. */
  bio?: string;
  /** Optional avatar — used in JSON-LD Person.image when present. */
  avatarUrl?: string;
}

// Public profile URL for an author — single source of truth so
// the byline link and Article JSON-LD never drift.
export function authorProfileUrl(slug: string, origin = 'https://sevenarrowsrecoveryarizona.com'): string {
  return `${origin}/who-we-are/meet-our-team/${slug}`;
}

// Curated list of staff who write for the Recovery Roadmap. Add
// new authors here as their `public_slug` on the team page. The
// /app/seo blog-creation tool will pick them up automatically.
export const BLOG_AUTHORS: BlogAuthor[] = [
  {
    slug: 'lindsay-rothschild',
    name: 'Lindsay Rothschild',
    title: 'Clinical Director',
    credentials: 'LCSW',
    bio: 'Clinical Director at Seven Arrows Recovery. Lindsay leads the clinical team in Elfrida, Arizona, and writes about trauma-informed addiction treatment.',
  },
];

export function findAuthorBySlug(slug: string | null | undefined): BlogAuthor | null {
  if (!slug) return null;
  return BLOG_AUTHORS.find((a) => a.slug === slug) ?? null;
}
