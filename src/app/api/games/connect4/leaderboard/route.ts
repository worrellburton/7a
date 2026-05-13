import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/games/connect4/leaderboard
//
// Returns the top-50 by rating with joined display name / avatar
// from the users table.

export const dynamic = 'force-dynamic';

interface RatingRow {
  user_id: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  matches_played: number;
  tournament_wins: number;
  last_match_at: string | null;
}

interface UserLite {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getAdminSupabase();

  const { data: ratings, error } = await admin
    .from('connect4_ratings')
    .select('user_id, rating, wins, losses, draws, matches_played, tournament_wins, last_match_at')
    .order('rating', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (ratings ?? []) as RatingRow[];
  const userIds = rows.map((r) => r.user_id);
  const { data: users } = userIds.length === 0
    ? { data: [] as UserLite[] }
    : await admin.from('users').select('id, full_name, email, avatar_url').in('id', userIds);
  const byId = new Map(((users ?? []) as UserLite[]).map((u) => [u.id, u] as const));

  return NextResponse.json({
    rows: rows.map((r) => ({
      ...r,
      user: byId.get(r.user_id) ?? null,
    })),
  });
}
