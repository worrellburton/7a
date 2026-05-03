import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/contacts/prefs   — org-wide column visibility + order
// PUT /api/contacts/prefs   — replace it
//
// Same shared_grid_prefs row pattern as /api/partnerships/prefs but
// keyed on scope='contacts'.

export const dynamic = 'force-dynamic';

const SCOPE = 'contacts';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('shared_grid_prefs')
    .select('visible_columns, column_order, updated_by, updated_at')
    .eq('scope', SCOPE)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { visible_columns: [], column_order: [] });
}

export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { visible_columns?: string[]; column_order?: string[] } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const visible_columns = Array.isArray(body.visible_columns)
    ? body.visible_columns.filter((v): v is string => typeof v === 'string')
    : [];
  const column_order = Array.isArray(body.column_order)
    ? body.column_order.filter((v): v is string => typeof v === 'string')
    : [];

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('shared_grid_prefs')
    .upsert(
      { scope: SCOPE, visible_columns, column_order, updated_by: user.id },
      { onConflict: 'scope' },
    )
    .select('visible_columns, column_order, updated_by, updated_at')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
