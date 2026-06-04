import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-gates';

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

export async function GET(req: NextRequest) {
  const gate = await requireUser(req);
  if (gate instanceof NextResponse) return gate;
  const { admin, isAdmin, isSuperAdmin, isAlumniAdmin } = gate;

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ q, results: [] });
  }
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;

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
    admin.from('contacts')
      .select('id, name, email, phone')
      .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
      .limit(LIMIT_PER_SURFACE),
    admin.from('blogs')
      .select('id, slug, title, status')
      .or(`title.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(LIMIT_PER_SURFACE),
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
    // Calls (only admins reach Calls today).
    isAdmin || isSuperAdmin
      ? admin.from('call_logs')
          .select('id, called_at, caller_number_formatted, source_name')
          .or(`caller_number_formatted.ilike.${pattern},source_name.ilike.${pattern}`)
          .order('called_at', { ascending: false })
          .limit(LIMIT_PER_SURFACE)
      : Promise.resolve({ data: [] as Array<{ id: number; called_at: string; caller_number_formatted: string | null; source_name: string | null }>, error: null }),
    // SEO directories.
    isAdmin || isSuperAdmin
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
      href: `/app/contacts?focus=${encodeURIComponent(r.id)}`,
    });
  }
  for (const r of (blogsRes.data ?? []) as Array<{ id: string; slug: string; title: string | null; status: string }>) {
    results.push({
      id: `blog:${r.id}`,
      surface: 'Blogs',
      label: r.title || r.slug,
      sub: r.status,
      href: `/app/content/${r.id}`,
    });
  }
  for (const r of (alumniRes.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
    results.push({
      id: `alumni:${r.id}`,
      surface: 'Alumni',
      label: r.full_name || r.email || 'Alumnus',
      sub: r.email,
      href: `/app/alumni/u/${r.id}`,
    });
  }
  for (const r of (callsRes.data ?? []) as Array<{ id: number; called_at: string; caller_number_formatted: string | null; source_name: string | null }>) {
    results.push({
      id: `call:${r.id}`,
      surface: 'Calls',
      label: r.caller_number_formatted || `Call ${r.id}`,
      sub: r.source_name ? `${r.source_name} · ${r.called_at?.slice(0, 10)}` : r.called_at?.slice(0, 10),
      href: `/app/calls/${r.id}`,
    });
  }
  for (const r of (directoriesRes.data ?? []) as Array<{ id: string; name: string | null; url: string | null }>) {
    results.push({
      id: `dir:${r.id}`,
      surface: 'Directories',
      label: r.name || r.url || 'Directory',
      sub: r.url,
      href: `/app/seo/directories?focus=${encodeURIComponent(r.id)}`,
    });
  }
  for (const r of (usersRes.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
    results.push({
      id: `user:${r.id}`,
      surface: 'People',
      label: r.full_name || r.email || 'Teammate',
      sub: r.email,
      href: `/app/admin/user-permissions?focus=${encodeURIComponent(r.id)}`,
    });
  }
  for (const r of (roadmapRes.data ?? []) as Array<{ id: string; working_title: string; target_keyword: string | null; blog_id: string | null }>) {
    results.push({
      id: `roadmap:${r.id}`,
      surface: 'Roadmap',
      label: r.working_title,
      sub: r.target_keyword || (r.blog_id ? 'Built' : 'Concept'),
      href: r.blog_id ? `/app/content/${r.blog_id}` : `/app/content`,
    });
  }

  return NextResponse.json({ q, results });
}
