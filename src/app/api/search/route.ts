import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-gates';
import type { SupabaseClient } from '@supabase/supabase-js';

// GET /api/search?q=...
//
// Powers the cmd+K command palette (src/components/CommandPalette.tsx).
// One signed-in fetch returns up to N matches per surface so the UI
// can render typed-ahead results across the whole admin app without
// querying each table separately.
//
// Auth: any signed-in user via requireUser. Each surface is then
// further trimmed server-side by what THIS user is allowed to see —
// alumni rows only show for super_admins / alumni_admins, content
// rows only show for the content gate, etc. Keeps the palette from
// leaking PII to a teammate who couldn't reach it via the sidebar.

export const dynamic = 'force-dynamic';

const LIMIT_PER_SURFACE = 8;

// The sidebar page that owns each searchable surface. A user only
// gets results from a surface when they can actually see its page —
// same model the sidebar uses (admin, department grant, or per-user
// override), so search can't leak rows from pages a teammate can't
// reach. (Previously contacts + blogs were searchable by ANY signed-in
// user, including alumni accounts.)
const SURFACE_PAGES = {
  contacts: '/feather/contacts',
  blogs: '/feather/content',
  calls: '/feather/ctm',
  directories: '/feather/seo',
} as const;

/** Which of `paths` this user may see, mirroring canSeePage. */
async function allowedPaths(
  admin: SupabaseClient,
  userId: string,
  departmentId: string | null,
  isAdminLike: boolean,
  isStaff: boolean,
  paths: string[],
): Promise<Set<string>> {
  if (isAdminLike) return new Set(paths);
  // Alumni / guest accounts never search staff surfaces, whatever the
  // page rows say — mirrors the sidebar hiding staff pages from them.
  if (!isStaff) return new Set();
  const [pagesRes, overridesRes, extrasRes] = await Promise.all([
    admin.from('page_permissions').select('path, admin_only, allowed_departments').in('path', paths),
    admin.from('user_page_permissions').select('path, can_view').eq('user_id', userId).in('path', paths),
    admin.from('user_extra_departments').select('department_id').eq('user_id', userId),
  ]);
  const overrides = new Map<string, boolean>(
    ((overridesRes.data ?? []) as Array<{ path: string; can_view: boolean }>).map((r) => [r.path, r.can_view]),
  );
  const deptSet = new Set<string>([
    ...(departmentId ? [departmentId] : []),
    ...(((extrasRes.data ?? []) as Array<{ department_id: string }>).map((r) => r.department_id)),
  ]);
  const byPath = new Map(
    ((pagesRes.data ?? []) as Array<{ path: string; admin_only: boolean; allowed_departments: string[] | null }>).map(
      (r) => [r.path, r],
    ),
  );
  const out = new Set<string>();
  for (const path of paths) {
    const override = overrides.get(path);
    if (override === false) continue;
    if (override === true) { out.add(path); continue; }
    const page = byPath.get(path);
    if (!page) continue; // unknown page row → deny for non-admins
    if (page.admin_only) continue;
    const allowed = page.allowed_departments ?? [];
    if (allowed.length === 0 || [...deptSet].some((d) => allowed.includes(d))) out.add(path);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const gate = await requireUser(req);
  if (gate instanceof NextResponse) return gate;
  const { admin, isAdmin, isSuperAdmin, isAlumniAdmin, userId, departmentId, userKind } = gate;

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ q, results: [] });
  }
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;

  const visible = await allowedPaths(
    admin,
    userId,
    departmentId,
    isAdmin || isSuperAdmin,
    userKind === 'staff',
    Object.values(SURFACE_PAGES),
  );

  // Fan out the searches in parallel. Each surface returns the
  // minimum projection needed for the palette row (id + label +
  // sub-label + the path to navigate to).
  const [
    contactsRes,
    blogsRes,
    alumniRes,
    callsRes,
    directoriesRes,
    usersRes,
    roadmapRes,
  ] = await Promise.all([
    visible.has(SURFACE_PAGES.contacts)
      ? admin.from('contacts')
          .select('id, name, email, phone')
          .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
          .limit(LIMIT_PER_SURFACE)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string | null; email: string | null; phone: string | null }>, error: null }),
    visible.has(SURFACE_PAGES.blogs)
      ? admin.from('blogs')
          .select('id, slug, title, status')
          .or(`title.ilike.${pattern},slug.ilike.${pattern}`)
          .limit(LIMIT_PER_SURFACE)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string; title: string | null; status: string }>, error: null }),
    // Alumni surface visibility — only Super or Alumni admins can search
    // alumni. Regular admins see contacts/blogs/calls/etc., not alumni
    // rows, matching their sidebar reach.
    (isSuperAdmin || isAlumniAdmin)
      ? admin.from('users')
          .select('id, full_name, email')
          .eq('user_kind', 'alumni')
          .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
          .limit(LIMIT_PER_SURFACE)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }>, error: null }),
    // Calls — gated by CTM page access.
    visible.has(SURFACE_PAGES.calls)
      ? admin.from('call_logs')
          .select('id, called_at, caller_number_formatted, source_name')
          .or(`caller_number_formatted.ilike.${pattern},source_name.ilike.${pattern}`)
          .order('called_at', { ascending: false })
          .limit(LIMIT_PER_SURFACE)
      : Promise.resolve({ data: [] as Array<{ id: number; called_at: string; caller_number_formatted: string | null; source_name: string | null }>, error: null }),
    // SEO directories — gated by SEO page access.
    visible.has(SURFACE_PAGES.directories)
      ? admin.from('seo_custom_directories')
          .select('id, name, url')
          .or(`name.ilike.${pattern},url.ilike.${pattern}`)
          .limit(LIMIT_PER_SURFACE)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string | null; url: string | null }>, error: null }),
    // Staff users — admin surfaces only.
    isAdmin || isSuperAdmin
      ? admin.from('users')
          .select('id, full_name, email, user_kind')
          .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
          .neq('user_kind', 'alumni')
          .limit(LIMIT_PER_SURFACE)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null; user_kind: string }>, error: null }),
    // Content roadmap (super-admin only matches the content gate).
    isSuperAdmin
      ? admin.from('blog_roadmap_items')
          .select('id, working_title, target_keyword, blog_id')
          .or(`working_title.ilike.${pattern},target_keyword.ilike.${pattern}`)
          .limit(LIMIT_PER_SURFACE)
      : Promise.resolve({ data: [] as Array<{ id: string; working_title: string; target_keyword: string | null; blog_id: string | null }>, error: null }),
  ]);

  const results: Array<{
    id: string;
    surface: string;
    label: string;
    sub?: string | null;
    href: string;
  }> = [];

  for (const r of (contactsRes.data ?? []) as Array<{ id: string; name: string | null; email: string | null; phone: string | null }>) {
    results.push({
      id: `contact:${r.id}`,
      surface: 'Contacts',
      label: r.name || r.email || 'Contact',
      sub: r.email || r.phone || null,
      href: `/feather/contacts?focus=${encodeURIComponent(r.id)}`,
    });
  }
  for (const r of (blogsRes.data ?? []) as Array<{ id: string; slug: string; title: string | null; status: string }>) {
    results.push({
      id: `blog:${r.id}`,
      surface: 'Blogs',
      label: r.title || r.slug,
      sub: r.status,
      href: `/feather/content/${r.id}`,
    });
  }
  for (const r of (alumniRes.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
    results.push({
      id: `alumni:${r.id}`,
      surface: 'Alumni',
      label: r.full_name || r.email || 'Alumnus',
      sub: r.email,
      href: `/feather/alumni/u/${r.id}`,
    });
  }
  for (const r of (callsRes.data ?? []) as Array<{ id: number; called_at: string; caller_number_formatted: string | null; source_name: string | null }>) {
    results.push({
      id: `call:${r.id}`,
      surface: 'CTM',
      label: r.caller_number_formatted || `Call ${r.id}`,
      sub: r.source_name ? `${r.source_name} · ${r.called_at?.slice(0, 10)}` : r.called_at?.slice(0, 10),
      href: `/feather/ctm/${r.id}`,
    });
  }
  for (const r of (directoriesRes.data ?? []) as Array<{ id: string; name: string | null; url: string | null }>) {
    results.push({
      id: `dir:${r.id}`,
      surface: 'Directories',
      label: r.name || r.url || 'Directory',
      sub: r.url,
      href: `/feather/seo/directories?focus=${encodeURIComponent(r.id)}`,
    });
  }
  for (const r of (usersRes.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
    results.push({
      id: `user:${r.id}`,
      surface: 'People',
      label: r.full_name || r.email || 'Teammate',
      sub: r.email,
      href: `/feather/admin/user-permissions?focus=${encodeURIComponent(r.id)}`,
    });
  }
  for (const r of (roadmapRes.data ?? []) as Array<{ id: string; working_title: string; target_keyword: string | null; blog_id: string | null }>) {
    results.push({
      id: `roadmap:${r.id}`,
      surface: 'Roadmap',
      label: r.working_title,
      sub: r.target_keyword || (r.blog_id ? 'Built' : 'Concept'),
      href: r.blog_id ? `/feather/content/${r.blog_id}` : `/feather/content`,
    });
  }

  return NextResponse.json({ q, results });
}
