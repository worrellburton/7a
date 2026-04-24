import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { SEVEN_ARROWS_PLACE_ID } from '@/lib/places';

// GET /api/public/login-content — content the pre-auth login screen needs:
//   • real Google + curated reviews (never hidden, 4★+)
//   • staff-chosen favorite quotes (from users.favorite_quote)
//   • staff "what I love about 7A" picks (from users.favorite_seven_arrows)
//
// All sources are pre-filtered to what the user or admin opted to share.
// Nothing evergreen / hardcoded lives here — if the DB returns nothing,
// the login screen falls back to a silent state rather than brand boilerplate.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Review {
  id: string;
  text: string;
  author: string;
  byline: string;
  rating: number;
  source: 'google' | 'curated';
}

interface StaffBeat {
  id: string;
  kind: 'quote' | 'pick';
  text: string;
  author: string | null;
  role: string | null;
}

function clean(text: string | null | undefined): string {
  if (!text) return '';
  // Strip surrounding smart / straight quotes — the login UI adds its own.
  return text.trim().replace(/^[“”‘’"']+/, '').replace(/[“”‘’"']+$/, '').trim();
}

export async function GET() {
  const admin = getAdminSupabase();

  const [googleRes, curatedRes, usersRes] = await Promise.all([
    admin
      .from('google_reviews')
      .select('id, author_name, rating, text, relative_time')
      .eq('place_id', SEVEN_ARROWS_PLACE_ID)
      .eq('hidden', false)
      .gte('rating', 4)
      .not('text', 'is', null)
      .order('review_time', { ascending: false })
      .limit(40),
    admin
      .from('curated_reviews')
      .select('id, author_name, attribution, rating, text, featured, display_order')
      .eq('hidden', false)
      .gte('rating', 4)
      .order('display_order', { ascending: true, nullsFirst: false })
      .limit(40),
    admin
      .from('users')
      .select('id, full_name, job_title, favorite_quote, favorite_seven_arrows')
      .eq('status', 'active')
      .eq('public_team', true),
  ]);

  const reviews: Review[] = [];
  if (!googleRes.error) {
    for (const r of googleRes.data ?? []) {
      const text = clean(r.text as string | null);
      if (!text) continue;
      reviews.push({
        id: `g-${r.id}`,
        source: 'google',
        author: (r.author_name as string) || 'Google review',
        byline: (r.relative_time as string | null) || 'Google review',
        rating: (r.rating as number) ?? 5,
        text,
      });
    }
  } else {
    console.error(`[login-content] google select failed: ${googleRes.error.message}`);
  }
  if (!curatedRes.error) {
    for (const r of curatedRes.data ?? []) {
      const text = clean(r.text as string | null);
      if (!text) continue;
      reviews.push({
        id: `c-${r.id}`,
        source: 'curated',
        author: (r.author_name as string) || 'Alumni',
        byline: (r.attribution as string | null) || 'Alumni review',
        rating: (r.rating as number) ?? 5,
        text,
      });
    }
  } else {
    console.error(`[login-content] curated select failed: ${curatedRes.error.message}`);
  }

  const staffQuotes: StaffBeat[] = [];
  const staffPicks: StaffBeat[] = [];
  if (!usersRes.error) {
    for (const u of usersRes.data ?? []) {
      const quote = clean(u.favorite_quote as string | null);
      const pick  = clean(u.favorite_seven_arrows as string | null);
      if (quote) {
        staffQuotes.push({
          id: `q-${u.id}`,
          kind: 'quote',
          text: quote,
          author: (u.full_name as string | null) || null,
          role: (u.job_title as string | null) || null,
        });
      }
      if (pick) {
        staffPicks.push({
          id: `p-${u.id}`,
          kind: 'pick',
          text: pick,
          author: (u.full_name as string | null) || null,
          role: (u.job_title as string | null) || null,
        });
      }
    }
  } else {
    console.error(`[login-content] users select failed: ${usersRes.error.message}`);
  }

  return NextResponse.json({
    reviews,
    staffQuotes,
    staffPicks,
  });
}
