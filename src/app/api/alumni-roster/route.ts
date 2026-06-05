import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';
import { requireSuperOrAlumniAdmin } from '@/lib/api-gates';

// GET /api/alumni-roster
//
// Staff-facing roster of every user_kind='alumni' row, with their
// alumni_profiles fields joined in. Powers /app/alumni-roster.
//
// Gated by requireSuperOrAlumniAdmin — only super admins, regular
// admins (via is_admin), and alumni admins reach this. Privacy
// opt-ins on the alum's profile (phone_visible, email_visible,
// sobriety_public) DO NOT apply here — admins managing the roster
// need to see everything to spot incomplete profiles, stale
// sobriety dates, etc. The alumni-facing surfaces still respect
// the visibility flags.
//
// One round-trip, no pagination — alumni count is small (tens, not
// thousands), so client-side sort + search is faster than refetching.

export const dynamic = 'force-dynamic';

interface RosterRow {
  id: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  status: 'active' | 'on_hold' | 'denied' | null;
  createdAt: string;
  lastSignIn: string | null;
  lastSeenAt: string | null;
  // alumni_profiles join — null fields if no row yet.
  city: string | null;
  state: string | null;
  bio: string | null;
  interests: string[];
  availableFor: string[];
  phone: string | null;
  emailForAlumni: string | null;
  sobrietyDate: string | null;
  sobrietyPublic: boolean;
  trackSobriety: boolean;
  onMap: boolean;
  onPhoneList: boolean;
  phoneVisible: boolean;
  emailVisible: boolean;
  textOk: boolean;
  checkInStreak: number;
  lastCheckInAt: string | null;
  profileUpdatedAt: string | null;
}

export async function GET(req: NextRequest) {
  const gate = await requireSuperOrAlumniAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const admin = getAdminSupabase();

  // Two parallel reads — users + alumni_profiles. A LEFT JOIN via
  // PostgREST nested select would work too, but two indexed point
  // queries are cheaper than the nested-select planner cost at this
  // table size, and the join logic is trivial.
  const [usersRes, profilesRes] = await Promise.all([
    admin
      .from('users')
      .select('id, full_name, email, avatar_url, job_title, status, created_at, last_sign_in, last_seen_at')
      .eq('user_kind', 'alumni')
      .order('created_at', { ascending: false }),
    admin
      .from('alumni_profiles')
      .select('user_id, city, state, bio, interests, available_for, phone, email_for_alumni, sobriety_date, sobriety_public, track_sobriety, on_map, on_phone_list, phone_visible, email_visible, text_ok, check_in_streak, last_check_in_at, updated_at'),
  ]);

  if (usersRes.error) {
    return NextResponse.json({ error: usersRes.error.message }, { status: 500 });
  }

  type ProfileRow = {
    user_id: string;
    city: string | null;
    state: string | null;
    bio: string | null;
    interests: string[] | null;
    available_for: string[] | null;
    phone: string | null;
    email_for_alumni: string | null;
    sobriety_date: string | null;
    sobriety_public: boolean | null;
    track_sobriety: boolean | null;
    on_map: boolean | null;
    on_phone_list: boolean | null;
    phone_visible: boolean | null;
    email_visible: boolean | null;
    text_ok: boolean | null;
    check_in_streak: number | null;
    last_check_in_at: string | null;
    updated_at: string | null;
  };

  const profileByUserId = new Map<string, ProfileRow>();
  for (const p of (profilesRes.data ?? []) as ProfileRow[]) {
    profileByUserId.set(p.user_id, p);
  }

  type UserRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    job_title: string | null;
    status: 'active' | 'on_hold' | 'denied' | null;
    created_at: string;
    last_sign_in: string | null;
    last_seen_at: string | null;
  };

  const rows: RosterRow[] = ((usersRes.data ?? []) as UserRow[]).map((u) => {
    const p = profileByUserId.get(u.id);
    return {
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      jobTitle: u.job_title,
      status: u.status,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in,
      lastSeenAt: u.last_seen_at,
      city: p?.city ?? null,
      state: p?.state ?? null,
      bio: p?.bio ?? null,
      interests: Array.isArray(p?.interests) ? (p!.interests as string[]) : [],
      availableFor: Array.isArray(p?.available_for) ? (p!.available_for as string[]) : [],
      phone: p?.phone ?? null,
      emailForAlumni: p?.email_for_alumni ?? null,
      sobrietyDate: p?.sobriety_date ?? null,
      sobrietyPublic: p?.sobriety_public === true,
      trackSobriety: p?.track_sobriety === true,
      onMap: p?.on_map === true,
      onPhoneList: p?.on_phone_list === true,
      phoneVisible: p?.phone_visible === true,
      emailVisible: p?.email_visible === true,
      textOk: p?.text_ok === true,
      checkInStreak: typeof p?.check_in_streak === 'number' ? p!.check_in_streak : 0,
      lastCheckInAt: p?.last_check_in_at ?? null,
      profileUpdatedAt: p?.updated_at ?? null,
    };
  });

  return NextResponse.json({ rows });
}
