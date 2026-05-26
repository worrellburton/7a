import { NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';
import type { NextRequest } from 'next/server';

// POST /api/media/touch
//   body: { kind: 'image' | 'video', id: string }
//
// Bumps last_used_at on the matching site_images / site_videos row.
// Called from every media picker (social-media Build, email-campaign
// image picker, content editor, MediaPicker) so the asset the user
// just picked floats to the top of every library query across the
// app. Fire-and-forget on the client side — failures are non-fatal,
// the asset still gets picked.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { kind?: string; id?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const kind = body.kind === 'image' || body.kind === 'video' ? body.kind : null;
  const id = typeof body.id === 'string' ? body.id : null;
  if (!kind || !id) {
    return NextResponse.json({ error: 'kind ("image"|"video") and id required' }, { status: 400 });
  }
  // Strip an optional "img:" / "vid:" prefix the client-side library
  // tags onto its asset IDs so the same call signature works
  // regardless of whether the caller is the social-media panel (which
  // namespaces ids) or the content editor (which passes raw uuids).
  const cleanId = id.replace(/^(img|vid):/, '');

  const admin = getAdminSupabase();
  const table = kind === 'image' ? 'site_images' : 'site_videos';
  const { error } = await admin
    .from(table)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', cleanId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
