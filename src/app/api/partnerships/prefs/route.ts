import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/partnerships/prefs   — org-wide column visibility + order + widths
// PUT /api/partnerships/prefs   — partial update (any of visible_columns,
//                                 column_order, column_widths). Missing keys
//                                 preserve their current value so column
//                                 resize calls don't clobber visibility and
//                                 vice versa. Mirrors /api/contacts/prefs
//                                 so the two grids share the same shape.
//
// Single shared row in public.shared_grid_prefs keyed on
// scope='partners' so every teammate sees the same column layout.
// Realtime is enabled on the table — ManageColumns dialogs across
// open tabs hot-reload from each other.

export const dynamic = 'force-dynamic';

const SCOPE = 'partners';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('shared_grid_prefs')
    .select('visible_columns, column_order, column_widths, updated_by, updated_at')
    .eq('scope', SCOPE)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { visible_columns: [], column_order: [], column_widths: {} });
}

export async function PUT(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { visible_columns?: unknown; column_order?: unknown; column_widths?: unknown } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const admin = getAdminSupabase();
  const { data: existing } = await admin
    .from('shared_grid_prefs')
    .select('visible_columns, column_order, column_widths')
    .eq('scope', SCOPE)
    .maybeSingle();

  const visible_columns = Array.isArray(body.visible_columns)
    ? (body.visible_columns as unknown[]).filter((v): v is string => typeof v === 'string')
    : (existing?.visible_columns ?? []);
  const column_order = Array.isArray(body.column_order)
    ? (body.column_order as unknown[]).filter((v): v is string => typeof v === 'string')
    : (existing?.column_order ?? []);

  // Width payload — flat {colKey: number} object. Coerce numbers, drop
  // NaN / non-finite / out-of-range values so a misbehaving client
  // can't poison the shared row. Same bounds outreach uses (60-1200px).
  let column_widths: Record<string, number> = (existing?.column_widths as Record<string, number> | null) ?? {};
  if (body.column_widths && typeof body.column_widths === 'object' && !Array.isArray(body.column_widths)) {
    const incoming = body.column_widths as Record<string, unknown>;
    const merged: Record<string, number> = { ...column_widths };
    for (const [k, v] of Object.entries(incoming)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 60 && n <= 1200) {
        merged[k] = Math.round(n);
      } else if (v === null) {
        delete merged[k];
      }
    }
    column_widths = merged;
  }

  const { data, error } = await admin
    .from('shared_grid_prefs')
    .upsert(
      { scope: SCOPE, visible_columns, column_order, column_widths, updated_by: user.id },
      { onConflict: 'scope' },
    )
    .select('visible_columns, column_order, column_widths, updated_by, updated_at')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
