import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// POST /api/seo/redirects/hit
//   body: { from_path: string }
//
// Called fire-and-forget by the middleware after a successful
// redirect so admins can see which rules are actually taking traffic.
// Uses the redirects_bump_hit RPC (SECURITY DEFINER) so counters
// update atomically.

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }
  const from_path = typeof body.from_path === 'string' ? body.from_path : '';
  if (!from_path) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = getAdminSupabase();
  const { error } = await admin.rpc('redirects_bump_hit', { p_from_path: from_path });
  if (error) {
    // Don't error the middleware; just log.
    console.warn('[redirects/hit] bump failed:', error.message);
  }
  return NextResponse.json({ ok: true });
}
