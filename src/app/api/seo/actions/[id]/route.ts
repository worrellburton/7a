import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// PATCH  /api/seo/actions/:id  → update fields (title, description, status, priority, category)
// DELETE /api/seo/actions/:id  → remove an action permanently

export const dynamic = 'force-dynamic';

const STATUS_VALUES = ['open', 'in_progress', 'done', 'wontfix'] as const;
const PRIORITY_VALUES = ['low', 'medium', 'high'] as const;

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { ok: true as const, supabase };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;

  let body: {
    title?: string;
    description?: string | null;
    category?: string | null;
    priority?: (typeof PRIORITY_VALUES)[number];
    status?: (typeof STATUS_VALUES)[number];
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const update: Record<string, string | null> = {};
  if (typeof body.title === 'string') {
    const t = body.title.trim();
    if (t.length === 0 || t.length > 200) {
      return NextResponse.json({ error: 'Title must be 1-200 chars' }, { status: 400 });
    }
    update.title = t;
  }
  if (body.description !== undefined) {
    update.description = typeof body.description === 'string' ? body.description.trim() || null : null;
  }
  if (body.category !== undefined) {
    update.category = typeof body.category === 'string' ? body.category.trim() || null : null;
  }
  if (body.priority !== undefined) {
    if (!PRIORITY_VALUES.includes(body.priority)) {
      return NextResponse.json({ error: `priority must be one of ${PRIORITY_VALUES.join(', ')}` }, { status: 400 });
    }
    update.priority = body.priority;
  }
  if (body.status !== undefined) {
    if (!STATUS_VALUES.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of ${STATUS_VALUES.join(', ')}` }, { status: 400 });
    }
    update.status = body.status;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('seo_actions')
    .update(update)
    .eq('id', id)
    .select(
      'id, title, description, category, priority, status, submitted_by, submitted_by_name, completed_at, created_at, updated_at',
    )
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ action: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const { error } = await auth.supabase.from('seo_actions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
