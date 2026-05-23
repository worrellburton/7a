import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-gates';

// GET /api/kaizen/recommendations
//
// Returns the latest scan's recommendations grouped by area.
// Admin-readable (RLS on the tables grants both is_admin and
// is_super_admin) but the page surface is super-admin gated at
// the runtime check inside content.tsx.

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  // Latest scan, in any status. The page surfaces 'running' too so
  // the user sees a spinner while Claude is responding.
  const { data: scans, error: scanErr } = await gate.admin
    .from('kaizen_scans')
    .select('id, scanned_at, status, model, error_message, triggered_by, created_at')
    .order('scanned_at', { ascending: false })
    .limit(1);
  if (scanErr) return NextResponse.json({ error: scanErr.message }, { status: 500 });
  const scan = (scans ?? [])[0] ?? null;

  if (!scan) {
    return NextResponse.json({ scan: null, recommendations: [] });
  }

  const { data: recs, error: recErr } = await gate.admin
    .from('kaizen_recommendations')
    .select('id, area, category, seo_geo, title, description, copy_prompt, priority, dismissed_at, created_at')
    .eq('scan_id', scan.id)
    .is('dismissed_at', null)
    .order('area', { ascending: true })
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });
  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });

  return NextResponse.json({ scan, recommendations: recs ?? [] });
}
