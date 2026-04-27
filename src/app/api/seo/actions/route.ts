import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// GET  /api/seo/actions  → list every action, sorted open-first
// POST /api/seo/actions  → submit a new action
//
// Both gated to is_admin via the RLS policies on public.seo_actions
// — the route still re-checks here so we can return a friendly 403
// instead of a generic Postgres "row violates row-level security"
// error when a non-admin tries.

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
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const PRIORITY_VALUES = ['low', 'medium', 'high'] as const;

async function requireAdmin(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof getServerSupabase>>; userId: string; userName: string | null }
  | { ok: false; res: NextResponse }
> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin, full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, supabase, userId: user.id, userName: profile.full_name ?? null };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  // Open + in_progress first (active work), then done + wontfix
  // afterwards. Within each bucket, high priority before low and
  // newest before oldest — so the action board reads top-down.
  const { data, error } = await auth.supabase
    .from('seo_actions')
    .select(
      'id, title, description, category, priority, status, submitted_by, submitted_by_name, completed_at, created_at, updated_at',
    )
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ actions: (data ?? []) as ActionRow[] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  let body: {
    title?: string;
    description?: string | null;
    category?: string | null;
    priority?: 'low' | 'medium' | 'high';
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title = (body.title ?? '').trim();
  if (title.length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: 'Title must be 200 characters or fewer' }, { status: 400 });
  }
  const priority = body.priority && PRIORITY_VALUES.includes(body.priority) ? body.priority : 'medium';

  const { data, error } = await auth.supabase
    .from('seo_actions')
    .insert({
      title,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      category: typeof body.category === 'string' ? body.category.trim() || null : null,
      priority,
      submitted_by: auth.userId,
      submitted_by_name: auth.userName,
    })
    .select(
      'id, title, description, category, priority, status, submitted_by, submitted_by_name, completed_at, created_at, updated_at',
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ action: data as ActionRow }, { status: 201 });
}
