import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';
import { BLOG_AUTHORS, type BlogAuthor } from '@/lib/blogAuthors';

// GET /api/blog-authors
//
// Returns the union of:
//   1. Every users row flagged is_blog_author OR is_medical_reviewer
//      (HR adds new authors here via /app/team without a code deploy).
//   2. The hard-coded BLOG_AUTHORS seed in /lib/blogAuthors.ts
//      (fallback for environments where the DB isn't reachable
//      and for the rare case where a static EPISODE references a
//      slug that's been removed from users).
//
// Dedup is by public_slug — DB-row data wins when both sources
// carry the same slug, since HR can edit the DB row but not the
// committed file.
//
// Used by the /app/content/[id] Byline panel dropdowns. Admin-only
// (the dropdowns ship on a super-admin page).

export const dynamic = 'force-dynamic';

export interface BlogAuthorOut extends BlogAuthor {
  source: 'db' | 'fallback';
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const { data: meRow } = await admin
    .from('users')
    .select('is_admin, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!meRow?.is_admin && !meRow?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // The byline + medical-reviewer dropdowns on /app/content/[id]
  // now surface EVERY active staff member, not just users flagged
  // is_blog_author / is_medical_reviewer. The flag is preserved on
  // the row (medical reviewers still tagged for downstream JSON-LD
  // accuracy), but the picker shows the full roster so an admin
  // doesn't have to round-trip /app/team to toggle a flag every
  // time they want to byline a new teammate.
  const { data: rows, error } = await admin
    .from('users')
    .select('public_slug, full_name, job_title, credentials, bio, avatar_url, linkedin_url, is_blog_author, is_medical_reviewer, status, user_kind')
    .eq('status', 'active')
    .neq('user_kind', 'alumni');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const dbAuthors: BlogAuthorOut[] = ((rows ?? []) as Array<{
    public_slug: string | null;
    full_name: string | null;
    job_title: string | null;
    credentials: string | null;
    bio: string | null;
    avatar_url: string | null;
    linkedin_url: string | null;
    is_blog_author: boolean;
    is_medical_reviewer: boolean;
    status: string | null;
    user_kind: string | null;
  }>)
    .filter((r) => r.public_slug && r.full_name)
    .map((r) => ({
      slug: r.public_slug as string,
      name: r.full_name as string,
      title: r.job_title ?? 'Team member',
      credentials: r.credentials ?? undefined,
      bio: r.bio ?? undefined,
      avatarUrl: r.avatar_url ?? undefined,
      sameAs: r.linkedin_url ? [r.linkedin_url] : undefined,
      isMedicalReviewer: r.is_medical_reviewer === true,
      source: 'db',
    }));

  // Merge in the seed list, preferring DB rows.
  const dbSlugs = new Set(dbAuthors.map((a) => a.slug));
  const fallbacks: BlogAuthorOut[] = BLOG_AUTHORS
    .filter((a) => !dbSlugs.has(a.slug))
    .map((a) => ({ ...a, source: 'fallback' }));

  const all = [...dbAuthors, ...fallbacks].sort((a, b) => a.name.localeCompare(b.name));
  // Reviewer dropdown now shows the same full roster the author
  // dropdown does. The downstream MedicalWebPage JSON-LD still
  // reads the picked reviewer's credentials off the users row,
  // so an admin who picks an uncredentialed teammate gets an
  // accurate (if minimal) reviewer block rather than a hidden
  // option. Keeps the picker permissive while keeping the
  // schema honest.
  const reviewers = all;

  return NextResponse.json({ authors: all, reviewers });
}
