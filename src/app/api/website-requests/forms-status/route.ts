import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { requireWebsiteRequestsAccess } from '@/lib/website-requests-auth';

// POST /api/website-requests/forms-status
//   body: { id: string, status: 'new' | 'seen' | 'closed' | 'contacted' | 'archived' }
//
// Drives the New → Seen → Closed toggle on the /app/website-requests
// Forms panel. Same auth surface as the delete + respond endpoints.

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['new', 'seen', 'closed', 'contacted', 'archived']);

type Body = { id?: string; status?: string };

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const auth = await requireWebsiteRequestsAccess(supabase);
  if (auth.response) return auth.response;

  let body: Body;
  try { body = (await req.json()) as Body; } catch { body = {}; }
  const id = typeof body.id === 'string' ? body.id : null;
  const status = typeof body.status === 'string' ? body.status : null;
  if (!id || !status || !ALLOWED.has(status)) {
    return NextResponse.json({ error: 'Missing or invalid id/status' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { error } = await admin
    .from('contact_submissions')
    .update({ status })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id, status });
}
