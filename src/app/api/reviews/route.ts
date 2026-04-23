import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';

// GET  /api/reviews — list every row from google_reviews + curated_reviews
//                     (admin-only, includes hidden rows so admins can unhide)
// POST /api/reviews — create a curated review
//
// PATCH/DELETE for individual rows live in [id]/route.ts. Google rows
// can be PATCHed (hide/feature/order) but never DELETEd from this API
// — they're owned by the sync cron and would just come back.

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { error: null as null };
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const admin = getAdminSupabase();

  const [googleRes, curatedRes] = await Promise.all([
    admin
      .from('google_reviews')
      .select('id, place_id, author_name, profile_photo_url, rating, relative_time, text, review_time, featured, hidden, display_order, fetched_at')
      .order('review_time', { ascending: false }),
    admin
      .from('curated_reviews')
      .select('id, author_name, attribution, rating, text, featured, hidden, display_order, created_at, updated_at')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
  ]);

  if (googleRes.error) return NextResponse.json({ error: `google select failed: ${googleRes.error.message}` }, { status: 500 });
  if (curatedRes.error) return NextResponse.json({ error: `curated select failed: ${curatedRes.error.message}` }, { status: 500 });

  return NextResponse.json({
    google: googleRes.data ?? [],
    curated: curatedRes.data ?? [],
    counts: {
      google_total: googleRes.data?.length ?? 0,
      google_hidden: googleRes.data?.filter((r) => r.hidden).length ?? 0,
      google_featured: googleRes.data?.filter((r) => r.featured).length ?? 0,
      curated_total: curatedRes.data?.length ?? 0,
      curated_hidden: curatedRes.data?.filter((r) => r.hidden).length ?? 0,
      curated_featured: curatedRes.data?.filter((r) => r.featured).length ?? 0,
    },
  });
}

interface CreateBody {
  author_name?: string;
  attribution?: string | null;
  rating?: number;
  text?: string;
  featured?: boolean;
  hidden?: boolean;
  display_order?: number | null;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const author_name = body.author_name?.trim();
  const text = body.text?.trim();
  const rating = Number(body.rating);
  if (!author_name) return NextResponse.json({ error: 'author_name required' }, { status: 400 });
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 });
  }

  const admin = getAdminSupabase();
  const { data, error } = await admin
    .from('curated_reviews')
    .insert({
      author_name,
      attribution: body.attribution ?? null,
      rating: Math.round(rating),
      text,
      featured: Boolean(body.featured),
      hidden: Boolean(body.hidden),
      display_order: body.display_order ?? null,
    })
    .select('id, author_name, attribution, rating, text, featured, hidden, display_order, created_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: `insert failed: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true, review: data });
}
