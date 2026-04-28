import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// GET  /api/seo/actions  → list every action, sorted active-first
// POST /api/seo/actions  → submit a new action (or upsert by
//                          source_directory_id when one is provided
//                          so re-saving a directory link doesn't
//                          pile up duplicates)

export const dynamic = 'force-dynamic';

interface ActionRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'done' | 'wontfix';
  submitted_by: string | null;
  submitted_by_name: string | null;
  submitted_by_avatar_url: string | null;
  screenshot_urls: string[];
  source_directory_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const PRIORITY_VALUES = ['low', 'medium', 'high'] as const;
const STATUS_VALUES = ['open', 'in_progress', 'done', 'wontfix'] as const;
const SELECT_COLS =
  'id, title, description, category, priority, status, submitted_by, submitted_by_name, submitted_by_avatar_url, screenshot_urls, source_directory_id, completed_at, created_at, updated_at';

// Any signed-in user can list/submit SEO actions. Row-level rules
// in the seo_actions RLS policy still gate update/delete to the
// submitter (or a super-admin), so opening this up is safe.
async function requireUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  return {
    ok: true as const,
    supabase,
    userId: user.id,
    userName: (profile?.full_name as string | null) ?? null,
    userAvatar: (profile?.avatar_url as string | null) ?? null,
  };
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  // Newest-first only. Submitting an action is now treated as
  // logging completed work, so the old status-then-recency sort
  // (which pushed legacy not-done rows up regardless of date) just
  // produces a confusing mixed timeline. Newest at top, oldest at
  // bottom.
  const { data, error } = await auth.supabase
    .from('seo_actions')
    .select(SELECT_COLS)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ actions: (data ?? []) as ActionRow[] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  let body: {
    title?: string;
    description?: string | null;
    category?: string | null;
    priority?: (typeof PRIORITY_VALUES)[number];
    status?: (typeof STATUS_VALUES)[number];
    screenshot_urls?: string[];
    source_directory_id?: string | null;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = (body.title ?? '').trim();
  if (title.length === 0) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }
  if (title.length > 4000) {
    return NextResponse.json({ error: 'Message must be 4000 characters or fewer' }, { status: 400 });
  }
  const priority =
    body.priority && PRIORITY_VALUES.includes(body.priority) ? body.priority : 'medium';
  const status =
    body.status && STATUS_VALUES.includes(body.status) ? body.status : 'open';

  const screenshotUrls = Array.isArray(body.screenshot_urls)
    ? body.screenshot_urls.filter((u): u is string => typeof u === 'string' && u.length > 0).slice(0, 12)
    : [];

  const payload = {
    title,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    category: typeof body.category === 'string' ? body.category.trim() || null : null,
    priority,
    status,
    screenshot_urls: screenshotUrls,
    submitted_by: auth.userId,
    submitted_by_name: auth.userName,
    submitted_by_avatar_url: auth.userAvatar,
    source_directory_id:
      typeof body.source_directory_id === 'string' && body.source_directory_id.length > 0
        ? body.source_directory_id
        : null,
  };

  // Directory-link auto-log path: upsert by source_directory_id so
  // re-saving a URL doesn't create duplicates. Plain insert for
  // human-submitted actions (source_directory_id is null).
  if (payload.source_directory_id) {
    const { data, error } = await auth.supabase
      .from('seo_actions')
      .upsert(payload, { onConflict: 'source_directory_id' })
      .select(SELECT_COLS)
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ action: data as ActionRow }, { status: 201 });
  }

  const { data, error } = await auth.supabase
    .from('seo_actions')
    .insert(payload)
    .select(SELECT_COLS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ action: data as ActionRow }, { status: 201 });
}
