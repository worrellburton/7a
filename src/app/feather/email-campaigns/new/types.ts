// Shared types for the email-campaigns builder. Extracted from
// content.tsx so the FeaturedXCard / picker components can live in
// their own files without duplicating these interfaces.

export interface BlogOption {
  // For DB-backed AI-pipeline posts the id is the blogs.id UUID we
  // store on email_campaigns.featured_blog_id. For static Recovery
  // Roadmap episodes (no row in public.blogs) the id is the slug
  // itself, prefixed with "episode:" so the lookup paths can't
  // collide; the picker writes featured_episode_slug instead.
  id: string;
  title: string;
  slug: string | null;
  /** Recovery Roadmap episode number. Shown as the leading badge. */
  number: number | null;
  /** True for static EPISODES rows, false for AI-pipeline posts. */
  isStaticEpisode: boolean;
  // First blog_images row (lowest position). Used as the cover
  // image on the picker + the inline FeaturedBlogCard so the
  // marketer can recognise the post visually before reading the
  // title.
  coverImageUrl: string | null;
  coverImageAlt: string | null;
}

export interface EmployeeOption {
  id: string;
  full_name: string;
  job_title: string | null;
  avatar_url: string | null;
}

export interface HorseOption {
  id: string;
  name: string;
  image_url: string | null;
  works_in: string | null;
}

// A Google review the marketer can pin as the email's pull-quote. Sourced
// from public.google_reviews (the same pool the build route auto-picks from).
export interface QuoteOption {
  id: string;
  author_name: string;
  rating: number | null;
  text: string;
  relative_time: string | null;
}
